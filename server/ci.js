// Test-only release gate. Never imports the application or accepts a database URL.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { filesUnder } from './check-browser-syntax.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'jovelya-release-gate-'));
const fixture=path.join(scratch,'app');
const allowed=/^(PATH|HOME|USERPROFILE|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|LD_LIBRARY_PATH|DYLD_LIBRARY_PATH|PG_BIN|OPENSSL_BIN|PLAYWRIGHT_EXECUTABLE_PATH|PLAYWRIGHT_BROWSERS_PATH|CI|GITHUB_ACTIONS|NODE_EXTRA_CA_CERTS)$/i;
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>allowed.test(key)));
Object.assign(env,{NODE_ENV:'test',APP_STAGE:'test',DOTENV_CONFIG_PATH:path.join(scratch,'absent.env')});
const binary=name=>env.PG_BIN?path.join(env.PG_BIN,name+(process.platform==='win32'?'.exe':'')):name;
let cluster;
function run(executable,args,cwd=fixture,visible=false) {
  const result=spawnSync(executable,args,{cwd,env,windowsHide:true,encoding:'utf8',stdio:visible?'inherit':'pipe',timeout:600000});
  if(result.status!==0)throw new Error(`Release gate failed: ${path.basename(executable)} ${args.join(' ')}\n${result.error?.message || ''}\n${result.stdout || ''}\n${result.stderr || ''}`);
}
try {
  console.log('Release gate: checking prerequisites');
  for(const tool of ['initdb','postgres','pg_ctl','pg_dump','pg_restore'])run(binary(tool),['--version'],scratch);
  run(env.OPENSSL_BIN || 'openssl',['version'],scratch);
  fs.mkdirSync(fixture);
  for(const name of ['server','public','package.json','render.yaml','Dockerfile','.dockerignore'])fs.cpSync(path.join(root,name),path.join(fixture,name),{recursive:true});
  fs.symlinkSync(path.join(root,'node_modules'),path.join(fixture,'node_modules'),'junction');
  // Build anchors are LF-based. Normalize only disposable copies, never the checkout.
  for(const dir of ['server','public'])for(const file of filesUnder(path.join(fixture,dir))) {
    if(/\.(js|mjs|cjs|html|json|sql)$/.test(file))fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'));
  }
  console.log('Release gate: recursive backend syntax');
  for(const file of filesUnder(path.join(fixture,'server')).filter(f=>/\.(js|mjs|cjs)$/.test(f)))run(process.execPath,['--check',file]);
  console.log('Release gate: reproducible clean builds, release assertions and generated syntax');
  run(process.execPath,['server/build-check.js'],fixture,true);
  console.log('Release gate: starting a new isolated PostgreSQL cluster for C2');
  run(binary('initdb'),['-D','data','-U','postgres','--auth=trust','--no-locale','--encoding=UTF8'],scratch);
  const probe=net.createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');
  const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  cluster=spawn(binary('postgres'),['-D',path.join(scratch,'data'),'-h','127.0.0.1','-p',String(port)],{env,windowsHide:true,stdio:'ignore'});
  let startupError;cluster.on('error',err=>{startupError=err;});
  let ready=false;
  for(let attempt=0;attempt<100;attempt++) {
    if(startupError || cluster.exitCode!==null)throw new Error('Isolated PostgreSQL startup failed.');
    const client=new pg.Client({host:'127.0.0.1',port,user:'postgres',database:'postgres',ssl:false,connectionTimeoutMillis:500});
    try {await client.connect();await client.query('SELECT 1');ready=true;break;}catch {await delay(100);}finally{await client.end().catch(()=>{});}
  }
  if(!ready)throw new Error('Isolated PostgreSQL readiness timeout.');
  env.TEST_DATABASE_URL=`postgresql://postgres@127.0.0.1:${port}/postgres?sslmode=disable`;
  const tests=filesUnder(path.join(fixture,'server')).filter(f=>f.endsWith('.test.js'));
  for(const required of ['application.browser','auth-tokens','http-errors','database-tls','recovery','interview','check-browser-syntax','session.browser','record-network.browser','account.backend','account.browser','production-readiness','accessibility-ux.browser','container-runtime','patch-idempotence','pdf-download.browser']) {
    if(!tests.some(f=>path.basename(f)===required+'.test.js'))throw new Error('Missing required regression suite: '+required);
  }
  console.log(`Release gate: ${tests.length} regression suites (C1–C5, Interview, accessibility/UX, container runtime and gate checks)`);
  run(process.execPath,['--unhandled-rejections=strict','--test','--test-concurrency=1',...tests],fixture,true);
  console.log('RELEASE GATE PASSED');
} finally {
  if(cluster && cluster.exitCode===null && cluster.signalCode===null) {
    const result=spawnSync(binary('pg_ctl'),['-D',path.join(scratch,'data'),'-m','fast','-w','stop'],{env,windowsHide:true,encoding:'utf8',timeout:15000});
    if(result.status!==0) {const stopped=once(cluster,'exit');cluster.kill();await stopped;}
  }
  fs.rmSync(scratch,{recursive:true,force:true});
}
