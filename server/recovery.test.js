import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync, fork } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import { marker, recoveryTarget, provisionDatabase, backupDatabase, restoreDatabase } from './recovery.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const suffix=randomBytes(6).toString('hex');
const source='jovelya_drill_'+suffix+'_source', destination='jovelya_drill_'+suffix+'_restore';
const rollback='jovelya_drill_'+suffix+'_rollback', unmarked='jovelya_drill_'+suffix+'_unmarked';
const tables=['users','profiles','cv_documents','cover_letters','applications','password_reset_tokens','email_verification_tokens','ai_usage','feedback','audit_log','client_errors','beta_invites','beta_invite_uses'];
let scratch, cluster, admin, port, archive, app;
const executable=name=>path.join(process.env.PG_BIN || '',name+(process.platform==='win32'?'.exe':''));
const connection=name=>`postgresql://postgres@127.0.0.1:${port}/${name}?sslmode=disable`;
const env=name=>({RECOVERY_DATABASE_URL:connection(name),RECOVERY_ISOLATED:'YES',RECOVERY_CONFIRM:name,PG_BIN:process.env.PG_BIN});
async function client(name,user='postgres') {const c=new pg.Client({host:'127.0.0.1',port,database:name,user,ssl:false});await c.connect();return c;}
before(async()=>{
  assert.notEqual(process.env.NODE_ENV,'production');assert.notEqual(process.env.APP_STAGE,'production');
  scratch=fs.mkdtempSync(path.join(os.tmpdir(),'jovelya-recovery-'));archive=path.join(scratch,'synthetic.dump');
  const init=spawnSync(executable('initdb'),['-D','data','-U','postgres','--auth=trust','--no-locale','--encoding=UTF8'],{cwd:scratch,encoding:'utf8',windowsHide:true});
  assert.equal(init.status,0,'Set PG_BIN to native PostgreSQL tools: '+(init.error?.message || init.stderr));
  const probe=net.createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  cluster=spawn(executable('postgres'),['-D',path.join(scratch,'data'),'-h','127.0.0.1','-p',String(port)],{windowsHide:true,stdio:'ignore'});
  let failure;
  for(let attempt=0;attempt<100;attempt++) {try {admin=await client('postgres');break;} catch(err) {failure=err;await delay(100);}}
  assert.ok(admin,failure?.message);
  for(const name of [source,destination,rollback,unmarked]) {await admin.query(`CREATE DATABASE "${name}"`);if(name!==unmarked)await admin.query(`COMMENT ON DATABASE "${name}" IS '${marker}'`);}
});
after(async()=>{
  if(app && app.exitCode===null && app.signalCode===null) {const done=once(app,'exit');app.kill();await done;}
  await admin?.end();
  if(cluster && cluster.exitCode===null && cluster.signalCode===null) {
    const stopped=spawnSync(executable('pg_ctl'),['-D',path.join(scratch,'data'),'-m','fast','-w','stop'],{encoding:'utf8',windowsHide:true});
    if(stopped.status!==0) {const done=once(cluster,'exit');cluster.kill();await done;}
  }
  if(scratch)fs.rmSync(scratch,{recursive:true,force:true});
});
test('production, remote, default port, disguised and unconfirmed targets are refused before connecting',()=>{
  for(const overrides of [{NODE_ENV:'production'},{APP_STAGE:'production'},{RECOVERY_CONFIRM:'wrong'},{RECOVERY_ISOLATED:'NO'},
    {RECOVERY_DATABASE_URL:connection(source).replace('127.0.0.1','example.test')},
    {RECOVERY_DATABASE_URL:connection(source).replace(':'+port,':5432')},
    {RECOVERY_DATABASE_URL:connection(source)+'&host=example.test'}, {RECOVERY_DATABASE_URL:connection('postgres')}])assert.throws(()=>recoveryTarget({...env(source),...overrides}));
  assert.throws(()=>recoveryTarget({DATABASE_URL:connection(source)}));
});
test('unmarked database is refused without provisioning',async()=>{await assert.rejects(provisionDatabase(env(unmarked)),/verify isolated/);});
test('fresh schema provisions all 13 tables and repeat migration is idempotent',async()=>{
  await provisionDatabase(env(source));await provisionDatabase(env(source));const c=await client(source);
  try {assert.deepEqual((await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename),[...tables,'schema_migrations'].sort());assert.equal((await c.query('SELECT count(*)::int AS n FROM schema_migrations')).rows[0].n,1);}finally{await c.end();}
});
test('migration failure rolls back DDL and ledger; changed migration is refused',async()=>{
  const migrations=path.join(scratch,'migrations');fs.mkdirSync(migrations);fs.writeFileSync(path.join(migrations,'001_bad.sql'),'CREATE TABLE public.partial(id integer); SELECT missing_column;');
  await assert.rejects(provisionDatabase(env(rollback),migrations));const c=await client(rollback);
  try {assert.deepEqual((await c.query("SELECT to_regclass('public.partial') AS t, to_regclass('public.schema_migrations') AS m")).rows[0],{t:null,m:null});}finally{await c.end();}
  const modified=path.join(scratch,'modified');fs.cpSync(path.join(root,'server/migrations'),modified,{recursive:true});fs.appendFileSync(path.join(modified,'001_application.sql'),'\n-- changed');
  await assert.rejects(provisionDatabase(env(source),modified),/checksum mismatch/);
});
test('synthetic records cover every application table; defaults and relationships are compatible',async()=>{
  const c=await client(source);
  try {
    await c.query("INSERT INTO users(email,password_hash,email_verified) VALUES('synthetic@example.test','synthetic-not-a-real-password',true)");
    await c.query("INSERT INTO profiles(user_id,data_json) VALUES(1,'{\"name\":\"Synthetic\"}')");
    await c.query("INSERT INTO cv_documents(user_id,title,data_json,is_primary) VALUES(1,'Synthetic CV','{\"name\":\"Synthetic\"}',true)");
    await c.query("INSERT INTO cover_letters(user_id,title,content) VALUES(1,'Synthetic letter','Synthetic content')");
    await c.query("INSERT INTO applications(user_id,company,role,applied_date) VALUES(1,'Synthetic Company','Engineer','')");
    for(const table of ['password_reset_tokens','email_verification_tokens'])await c.query(`INSERT INTO ${table}(user_id,token_hash,expires_at) VALUES(1,$1,CURRENT_TIMESTAMP+interval '30 minutes')`,[table+'-synthetic-hash']);
    await c.query("INSERT INTO ai_usage(user_id,usage_date,request_count) VALUES(1,CURRENT_DATE,1) ON CONFLICT(user_id,usage_date) DO UPDATE SET request_count=ai_usage.request_count+1");
    await c.query("INSERT INTO feedback(user_id,message) VALUES(1,'Synthetic feedback')");
    await c.query("INSERT INTO audit_log(user_id,event_type,event_data) VALUES(1,'synthetic','{}')");
    await c.query("INSERT INTO client_errors(user_id,message,line,column_no) VALUES(1,'Synthetic error',3,4)");
    await c.query("INSERT INTO beta_invites(code,created_by) VALUES('SYNTHETIC',1)");await c.query('INSERT INTO beta_invite_uses(invite_id,user_id) VALUES(1,1)');
    for(const table of tables)assert.equal((await c.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n,1,table);
    await assert.rejects(c.query("INSERT INTO users(email,password_hash) VALUES('synthetic@example.test','duplicate')"),{code:'23505'});
    await assert.rejects(c.query("INSERT INTO applications(user_id,company,role) VALUES(999,'Invalid','Invalid')"),{code:'23503'});
  }finally{await c.end();}
});
test('pg_dump / pg_restore preserves records, constraints, indexes and identity sequences',async()=>{
  await backupDatabase(archive,env(source));await restoreDatabase(archive,env(destination));const a=await client(source),b=await client(destination);
  try {
    for(const table of [...tables,'schema_migrations'])assert.deepEqual((await b.query(`SELECT * FROM ${table} ORDER BY 1`)).rows,(await a.query(`SELECT * FROM ${table} ORDER BY 1`)).rows,table);
    const schema="SELECT c.relname, con.conname, pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY 1,2";
    assert.deepEqual((await b.query(schema)).rows,(await a.query(schema)).rows);
    const indexes="SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY 1,2";assert.deepEqual((await b.query(indexes)).rows,(await a.query(indexes)).rows);
    assert.equal((await b.query("INSERT INTO applications(user_id,company,role) VALUES(1,'New synthetic','New role') RETURNING id")).rows[0].id,Number((await a.query('SELECT last_value FROM applications_id_seq')).rows[0].last_value)+1);
    assert.equal((await a.query('SELECT count(*)::int AS n FROM applications')).rows[0].n,1);
  }finally{await a.end();await b.end();}
});
test('restore refuses non-empty/source targets and corrupt archives; backup refuses overwrite',async()=>{
  await assert.rejects(restoreDatabase(archive,env(source)),/destination/);await assert.rejects(restoreDatabase(archive,env(destination)),/empty/);await assert.rejects(backupDatabase(archive,env(source)),/already exists/);
  const corrupt=path.join(scratch,'corrupt.dump');fs.copyFileSync(archive,corrupt);fs.copyFileSync(archive+'.json',corrupt+'.json');fs.appendFileSync(corrupt,'corrupt');await assert.rejects(restoreDatabase(corrupt,env(rollback)),/checksum/);
});
test('native backup failure removes partial output; failed restore rolls back all created tables',async()=>{
  const failed=path.join(scratch,'failed.dump');
  await assert.rejects(backupDatabase(failed,{...env(source),PG_BIN:path.join(scratch,'missing-tools')}),/pg_dump failed/);
  assert.equal(fs.existsSync(failed),false);assert.equal(fs.existsSync(failed+'.json'),false);
  const c=await client(rollback);
  try {
    // A type-name collision causes pg_restore to fail after earlier CREATE TABLEs.
    await c.query("CREATE TYPE public.users AS ENUM ('synthetic')");
    await assert.rejects(restoreDatabase(archive,env(rollback)),/pg_restore failed/);
    assert.equal((await c.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n,0);
    assert.ok((await c.query("SELECT to_regtype('public.users') AS t")).rows[0].t);
    await c.query('DROP TYPE public.users');
    await c.query('CREATE TABLE public.existing_data(id integer)');
    await assert.rejects(provisionDatabase(env(rollback)),/Existing schema/);
    assert.equal((await c.query("SELECT to_regclass('public.schema_migrations') AS t")).rows[0].t,null);
  }finally{await c.end();}
});
test('runtime role supports CRUD but cannot run DDL or change migration history',async()=>{
  await admin.query('CREATE ROLE jovelya_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS');
  const owner=await client(destination);try {await owner.query(fs.readFileSync(path.join(root,'server/runtime-grants.sql'),'utf8'));}finally{await owner.end();}const c=await client(destination,'jovelya_app');
  try {
    for(const table of tables)await c.query(`SELECT * FROM ${table} LIMIT 1`);
    const row=(await c.query("INSERT INTO applications(user_id,company,role) VALUES(1,'Role test','Role test') RETURNING id")).rows[0];await c.query('UPDATE applications SET notes=$1 WHERE id=$2',['synthetic',row.id]);await c.query('DELETE FROM applications WHERE id=$1',[row.id]);
    await assert.rejects(c.query('CREATE TABLE public.forbidden(id integer)'),{code:'42501'});await assert.rejects(c.query('DELETE FROM schema_migrations'),{code:'42501'});
  }finally{await c.end();}
});
test('generated backend serves restored data with runtime privileges; existing smoke test passes',async()=>{
  const fixture=path.join(scratch,'app');fs.mkdirSync(fixture);fs.cpSync(path.join(root,'server'),path.join(fixture,'server'),{recursive:true});fs.writeFileSync(path.join(fixture,'package.json'),'{"type":"module"}');fs.symlinkSync(path.join(root,'node_modules'),path.join(fixture,'node_modules'),'junction');
  const sourceFile=path.join(fixture,'server/index.js');fs.writeFileSync(sourceFile,fs.readFileSync(sourceFile,'utf8').replace(/\r\n/g,'\n'));
  const generated=spawnSync(process.execPath,[path.join(root,'server/pg-transform.js')],{cwd:fixture,encoding:'utf8'});assert.equal(generated.status,0,generated.stderr);
  fs.writeFileSync(path.join(fixture,'bootstrap.js'),`import express from 'express';const listen=express.application.listen;express.application.listen=function(...args){const server=listen.apply(this,args);server.once('listening',()=>process.send({port:server.address().port}));return server;};await import('./server/index.pg.generated.js');`);
  const secret='synthetic-recovery-jwt-test-secret-only-123456';
  app=fork(path.join(fixture,'bootstrap.js'),[],{cwd:fixture,silent:true,execArgv:['--unhandled-rejections=strict'],env:{...process.env,DATABASE_URL:connection(destination).replace('postgres@','jovelya_app@'),NODE_ENV:'test',APP_STAGE:'test',PORT:'0',JWT_SECRET:secret,EMAIL_MODE:'console',STRIPE_SECRET_KEY:'',DOTENV_CONFIG_PATH:path.join(fixture,'absent.env'),MAINTENANCE_MODE:'off',ALLOWED_ORIGIN:'',DATABASE_CA_CERT_PATH:''}});
  let output='';app.stdout.on('data',b=>output+=b);app.stderr.on('data',b=>output+=b);
  const ready=await Promise.race([once(app,'message'),once(app,'exit').then(()=>{throw new Error(output);}),delay(10000).then(()=>{throw new Error('Backend startup timeout');})]);const base='http://127.0.0.1:'+ready[0].port;
  const smoke=spawnSync(process.execPath,[path.join(root,'server/smoke-test.js')],{env:{...process.env,SMOKE_BASE_URL:base},encoding:'utf8'});assert.equal(smoke.status,0,smoke.stderr);
  for(const route of ['/api/cvs','/api/letters','/api/applications','/api/profile','/api/account/export']) {const response=await fetch(base+route,{headers:{authorization:'Bearer '+jwt.sign({id:1,tv:0},secret)},signal:AbortSignal.timeout(5000)});assert.equal(response.status,200,route);assert.ok(await response.json());}
  const stopped=once(app,'exit');app.kill();await stopped;
});
test('account-owned rows cascade; historical nullable references remain consistent',async()=>{
  const c=await client(destination);
  try {await c.query('DELETE FROM users WHERE id=1');
    for(const table of ['profiles','cv_documents','cover_letters','applications','ai_usage','password_reset_tokens','email_verification_tokens','beta_invite_uses'])assert.equal((await c.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n,0,table);
    for(const table of ['feedback','audit_log','client_errors'])assert.equal((await c.query(`SELECT user_id FROM ${table}`)).rows[0].user_id,null);assert.equal((await c.query('SELECT created_by FROM beta_invites')).rows[0].created_by,null);
  }finally{await c.end();}
});
