import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import { databaseConnectionOptions } from './database-tls.js';

const execute = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const marker = 'jovelya-disposable-recovery-v1';
const namePattern = /^jovelya_(drill|recovery)_[a-z0-9_]{8,40}$/;
export function recoveryTarget(env = process.env) {
  // Deliberately never fall back to the application's DATABASE_URL or .env.
  if (env.NODE_ENV?.toLowerCase() === 'production' || env.APP_STAGE?.toLowerCase() === 'production') throw new Error('Recovery tooling refuses production environments.');
  let url;
  try { url = new URL(env.RECOVERY_DATABASE_URL); } catch { throw new Error('Explicit RECOVERY_DATABASE_URL is required.'); }
  const name = decodeURIComponent(url.pathname.slice(1));
  if (url.hostname !== '127.0.0.1' || Number(url.port) < 1024 || !url.port || url.port === '5432' || !namePattern.test(name)) throw new Error('Recovery requires a named disposable loopback database on a non-default port.');
  if (env.RECOVERY_ISOLATED !== 'YES' || env.RECOVERY_CONFIRM !== name) throw new Error('Explicit isolated recovery confirmation must match the database name.');
  for (const key of url.searchParams.keys()) if (!['sslmode','sslrootcert'].includes(key)) throw new Error('Recovery URL overrides are not permitted.');
  const config = databaseConnectionOptions({...env,DATABASE_URL:url.toString()});
  return {url,name,config};
}
export async function recoveryClient(env = process.env) {
  const target = recoveryTarget(env);
  const client = new pg.Client({...target.config,connectionTimeoutMillis:5000});
  try {
    await client.connect();
    const {rows:[row]} = await client.query("SELECT current_database() AS name, shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
    if (row.name !== target.name || row.marker !== marker) throw new Error('Database is not marked as a disposable recovery target.');
    return client;
  } catch { await client.end().catch(()=>{}); throw new Error('Cannot verify isolated recovery target.'); }
}
async function nativeTool(tool,args,env) {
  const {url,name,config} = recoveryTarget(env);
  // Do not inherit libpq services/options/hosts/password files from the operator.
  const nativeEnv = Object.fromEntries(Object.entries(process.env).filter(([key])=>!/^PG/i.test(key)));
  Object.assign(nativeEnv,{PGHOST:'127.0.0.1',PGPORT:url.port,PGDATABASE:name,PGUSER:decodeURIComponent(url.username),
    PGPASSWORD:decodeURIComponent(url.password),PGSSLMODE:config.ssl === false ? 'disable' : 'verify-full',
    PGCONNECT_TIMEOUT:'5',PGPASSFILE:path.join(root,'__unused_recovery_pgpass__')});
  if(config.ssl?.ca) nativeEnv.PGSSLROOTCERT=env.DATABASE_CA_CERT_PATH || url.searchParams.get('sslrootcert');
  const executable = env.PG_BIN ? path.join(env.PG_BIN,tool+(process.platform === 'win32'?'.exe':'')) : tool;
  try { return await execute(executable,args,{env:nativeEnv,windowsHide:true,timeout:120000,maxBuffer:1024*1024}); }
  catch { throw new Error(`${tool} failed; no connection credentials or tool output were logged.`); }
}
export async function provisionDatabase(env = process.env, directory = path.join(root,'server/migrations')) {
  const client = await recoveryClient(env);
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(205005)');
    const {rows:[{ledger}]}=await client.query("SELECT to_regclass('public.schema_migrations') AS ledger");
    if(!ledger) {
      const {rows}=await client.query("SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f') LIMIT 1");
      if(rows.length) throw new Error('Existing schema requires manual comparison; baseline adoption is refused.');
      await client.query('CREATE TABLE public.schema_migrations(version text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    }
    const files=fs.readdirSync(directory).filter(name=>/^\d+_[a-z_]+\.sql$/.test(name)).sort();
    const applied=(await client.query('SELECT version,sha256 FROM public.schema_migrations')).rows;
    if(applied.some(row=>!files.includes(row.version))) throw new Error('Unknown migration in database.');
    for(const version of files) {
      const sql=fs.readFileSync(path.join(directory,version),'utf8');
      const hash=createHash('sha256').update(sql.replace(/\r\n/g,'\n')).digest('hex');
      const previous=applied.find(row=>row.version===version);
      if(previous) {if(previous.sha256!==hash)throw new Error('Applied migration checksum mismatch.');continue;}
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations(version,sha256) VALUES($1,$2)',[version,hash]);
    }
    await client.query('COMMIT');
  } catch(err) {await client.query('ROLLBACK');throw err;} finally {await client.end();}
}
function archivePath(file) {
  if(!file || !file.endsWith('.dump')) throw new Error('An explicit .dump path is required.');
  const resolved=path.resolve(file),parent=fs.realpathSync(path.dirname(resolved));
  const actual=path.join(parent,path.basename(resolved));
  const relative=path.relative(root,actual);
  if(!relative.startsWith('..'+path.sep) && !path.isAbsolute(relative)) throw new Error('Recovery archives must be outside the repository.');
  return actual;
}
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export async function backupDatabase(file,env=process.env) {
  recoveryTarget(env);
  const target=archivePath(file);
  if(fs.existsSync(target+'.json')) throw new Error('Backup manifest already exists.');
  const client=await recoveryClient(env); await client.end();
  fs.closeSync(fs.openSync(target,'wx',0o600));
  try {
    await nativeTool('pg_dump',['--format=custom','--no-owner','--no-acl','--schema=public','--file',target],env);
    fs.writeFileSync(target+'.json',JSON.stringify({format:1,scope:'public',source:recoveryTarget(env).name,sha256:digest(target)},null,2),{flag:'wx',mode:0o600});
  } catch(err) {fs.unlinkSync(target);throw err;}
}
export async function restoreDatabase(file,env=process.env) {
  const target=recoveryTarget(env),archive=archivePath(file);
  const manifest=JSON.parse(fs.readFileSync(archive+'.json','utf8'));
  if(manifest.format!==1 || manifest.scope!=='public' || !namePattern.test(manifest.source) || manifest.source===target.name || digest(archive)!==manifest.sha256) throw new Error('Invalid archive, checksum or restore destination.');
  const client=await recoveryClient(env);
  try {
    const {rows}=await client.query("SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p','v','m','S','f') LIMIT 1");
    if(rows.length) throw new Error('Restore requires an empty, separate database.');
    // Fresh PostgreSQL databases already have public. Keep it; never drop it.
    const {stdout}=await nativeTool('pg_restore',['--list',archive],env);
    const list=stdout.split(/\r?\n/).filter(line=>!/^\d+;\s+\d+\s+\d+\s+SCHEMA - public(?: |$)/.test(line)).join('\n');
    const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'jovelya-restore-list-'));
    const listFile=path.join(scratch,'restore.list');
    try {
      fs.writeFileSync(listFile,list,{mode:0o600});
      await nativeTool('pg_restore',['--exit-on-error','--single-transaction','--no-owner','--no-acl','--use-list',listFile,'--dbname',target.name,archive],env);
    } finally {fs.rmSync(scratch,{recursive:true,force:true});}
  } finally {await client.end();}
}
