import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, fork } from 'node:child_process';
import { once } from 'node:events';
import express from 'express';
import { assertProductionConfig, securityChecks, createCorsMiddleware } from './production-config.js';
import { readinessConfiguration, createReadinessProbe, createStartupProbe } from './readiness.js';

const valid = {
  NODE_ENV:'production', JWT_SECRET:'synthetic-readiness-secret-only-8e6f9b7a2c4d',
  DATABASE_URL:'postgresql://fixture:synthetic@database.invalid/app',
  PUBLIC_BASE_URL:'https://app.example.test', ALLOWED_ORIGIN:'https://one.example.test, https://two.example.test',
  DOMAIN:'app.example.test', SUPPORT_EMAIL:'support@example.test', ADMIN_EMAIL:'admin@example.test',
  EMAIL_MODE:'brevo', BREVO_API_KEY:'synthetic-email-key', BREVO_SENDER_EMAIL:'sender@example.test',
  AI_MODE:'disabled', MAINTENANCE_MODE:'off'
};
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let scratch;
before(()=>{
  assert.equal(process.env.NODE_ENV,'test','Run with NODE_ENV=test and an isolated TEST_DATABASE_URL');
  const url=new URL(process.env.TEST_DATABASE_URL);
  assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname));
  assert.ok(url.port && url.port!=='5432');
  assert.ok([...url.searchParams.keys()].every(key=>key==='sslmode'));
  scratch=fs.mkdtempSync(path.join(os.tmpdir(),'jovelya-readiness-'));
  fs.cpSync(path.join(root,'server'),path.join(scratch,'server'),{recursive:true});
  fs.writeFileSync(path.join(scratch,'package.json'),'{"type":"module"}');
  fs.symlinkSync(path.join(root,'node_modules'),path.join(scratch,'node_modules'),'junction');
  const source=path.join(scratch,'server/index.js');fs.writeFileSync(source,fs.readFileSync(source,'utf8').replace(/\r\n/g,'\n'));
  const build=spawnSync(process.execPath,['server/pg-transform.js'],{cwd:scratch,encoding:'utf8'});assert.equal(build.status,0,build.stderr);
  // Only the isolated fixture replaces the DB adapter. Real SELECT 1 goes exclusively
  // to the gate-created loopback database. Production TLS code remains untouched.
  fs.writeFileSync(path.join(scratch,'server/db.js'),`import pg from 'pg';
    const pool=new pg.Pool({connectionString:process.env.ISOLATED_URL,ssl:false,max:1,connectionTimeoutMillis:500,statement_timeout:500});
    export default { async ping(){
      globalThis.pingCalls=(globalThis.pingCalls||0)+1;
      if(globalThis.probeMode==='fail')throw new Error('PRIVATE database credentials');
      if(globalThis.probeMode==='hang')return new Promise(()=>{});
      await pool.query('SELECT 1');return true;
    },prepare(){throw new Error('Unexpected query in readiness fixture');} };
  `);
  fs.writeFileSync(path.join(scratch,'bootstrap.js'),`import express from 'express';
    process.on('message',message=>{if(message.env)Object.assign(process.env,message.env);if(message.mode)globalThis.probeMode=message.mode;process.send({ack:true});});
    const listen=express.application.listen;express.application.listen=function(...args){const server=listen.apply(this,args);server.once('listening',()=>process.send({port:server.address().port}));return server;};
    await import('./server/index.pg.generated.js');
  `);
});
after(()=>{if(scratch)fs.rmSync(scratch,{recursive:true,force:true});});
async function server(overrides={},reject=false){
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(PATH|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|USERPROFILE)$/i.test(key)));
  Object.assign(env,valid,overrides,{PORT:'0',ISOLATED_URL:process.env.TEST_DATABASE_URL,DOTENV_CONFIG_PATH:path.join(scratch,'absent.env')});
  const child=fork(path.join(scratch,'bootstrap.js'),[],{cwd:scratch,silent:true,env,execArgv:['--unhandled-rejections=strict']});
  let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
  const stop=async()=>{if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited;}};
  const timer=setTimeout(()=>child.kill(),20000);
  const result=await Promise.race([once(child,'message').then(([data])=>data),once(child,'exit').then(([exit])=>({exit}))]);
  clearTimeout(timer);
  if(reject){await stop();assert.ok(result.exit!==undefined&&result.exit!==0,output);assert.match(output,/Invalid production security configuration/);assert.doesNotMatch(output,/synthetic-email-key|postgresql:\/\/fixture|https:\/\/one/);return output;}
  assert.ok(result.port,output);
  return {stop,child,async set(message){const ack=once(child,'message');child.send(message);await ack;},async get(url,options={}){return fetch('http://127.0.0.1:'+result.port+url,{...options,signal:AbortSignal.timeout(5000)});}};
}
for(const [label,overrides] of [
  ['missing JWT',{JWT_SECRET:''}],['short JWT',{JWT_SECRET:'short'}],['repeated JWT',{JWT_SECRET:'x'.repeat(64)}],
  ['development fallback JWT',{JWT_SECRET:'development-secret-development-secret'}],
  ['missing database',{DATABASE_URL:''}],['invalid database',{DATABASE_URL:'https://database.invalid/app'}],
  ['missing public URL',{PUBLIC_BASE_URL:''}],['placeholder public URL',{PUBLIC_BASE_URL:'https://example.com'}],
  ['HTTP public URL',{PUBLIC_BASE_URL:'http://app.example.test'}],['malformed public URL',{PUBLIC_BASE_URL:'https://'}],
  ['missing origins',{ALLOWED_ORIGIN:''}],['wildcard origin',{ALLOWED_ORIGIN:'*'}],['malformed origin list',{ALLOWED_ORIGIN:'https://one.example.test,https://two.example.test/path'}]
])test('production refuses startup: '+label,async()=>{assert.throws(()=>assertProductionConfig({...valid,...overrides}));await server(overrides,true);});

test('valid production starts; both allowed origins, same-origin and non-browser requests work',async()=>{
  const s=await server();try{
    for(const origin of ['https://one.example.test','https://two.example.test','https://app.example.test']){
      const r=await s.get('/api/health',{headers:{Origin:origin}});assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),origin);assert.match(r.headers.get('vary'),/Origin/);
      const pre=await s.get('/api/account/export',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'}});assert.equal(pre.status,204);assert.equal(pre.headers.get('access-control-allow-origin'),origin);
    }
    assert.equal((await s.get('/api/health')).status,200);
    for(const origin of ['https://foreign.example.test','null','https://one.example.test.evil.test']){
      const r=await s.get('/api/health',{headers:{Origin:origin}});assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);assert.deepEqual(await r.json(),{error:'Origin not allowed.'});
    }
    assert.equal((await s.get('/api/health')).status,200);
  }finally{await s.stop();}
});

test('missing production origin configuration remains closed even without startup validation',async()=>{
  const app=express();app.use(createCorsMiddleware({...valid,ALLOWED_ORIGIN:''}));app.get('/',(req,res)=>res.json({ok:true}));
  const listener=app.listen(0,'127.0.0.1');await once(listener,'listening');
  try{const base='http://127.0.0.1:'+listener.address().port;
    for(const origin of ['https://app.example.test','https://foreign.example.test'])assert.equal((await fetch(base,{headers:{Origin:origin}})).status,403);
    assert.equal((await fetch(base)).status,200);
  }finally{await new Promise(resolve=>listener.close(resolve));}
});
for(const mode of ['development','test'])test(mode+' retains optional production settings and permissive empty-origin development behavior',async()=>{
  const s=await server({NODE_ENV:mode,JWT_SECRET:'',DATABASE_URL:'',PUBLIC_BASE_URL:'',ALLOWED_ORIGIN:'',EMAIL_MODE:'console'});
  try{const r=await s.get('/api/health',{headers:{Origin:'http://localhost:5173'}});assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),'http://localhost:5173');assert.equal((await s.get('/api/readiness')).status,200);}finally{await s.stop();}
});

test('readiness succeeds with isolated PostgreSQL and exposes only booleans; health has no config values',async()=>{
  const s=await server();try{
    const r=await s.get('/api/readiness');assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');
    const body=await r.json();assert.equal(body.ok,true);assert.equal(body.checks.database,true);assert.ok(Object.values(body.checks).every(value=>value===true));assert.deepEqual(Object.keys(body).sort(),['checks','ok']);
    const health=await(await s.get('/api/health')).json();assert.deepEqual(Object.keys(health).sort(),['ok','version']);
    assert.doesNotMatch(JSON.stringify({body,health}),/synthetic|example.test|postgresql|EMAIL_MODE|APP_STAGE/);
  }finally{await s.stop();}
});

test('database outage returns 503; liveness survives; startup admits once and never creates a dependency restart loop',async()=>{
  const s=await server();try{
    await s.set({mode:'fail'});
    for(const route of ['/api/readiness','/api/startup']){const r=await s.get(route);assert.equal(r.status,503);assert.doesNotMatch(JSON.stringify(await r.json()),/PRIVATE|credentials/);}
    assert.equal((await s.get('/api/health')).status,200);
    await s.set({mode:'ok'});assert.equal((await s.get('/api/startup')).status,200);
    await s.set({mode:'fail'});assert.equal((await s.get('/api/readiness')).status,503);assert.equal((await s.get('/api/startup')).status,200);assert.equal((await s.get('/api/health')).status,200);
    await s.set({mode:'ok'});assert.equal((await s.get('/api/readiness')).status,200);
  }finally{await s.stop();}
});

test('readiness rejects missing runtime configuration and email, maintenance and partially enabled dependencies',async()=>{
  const s=await server();try{
    for(const [key,value] of Object.entries({JWT_SECRET:'',DATABASE_URL:'',PUBLIC_BASE_URL:'',ALLOWED_ORIGIN:'',BREVO_API_KEY:'',DOMAIN:'',SUPPORT_EMAIL:'',ADMIN_EMAIL:'',EMAIL_MODE:'console',AI_MODE:'openai',STRIPE_SECRET_KEY:'sk_test_synthetic',MAINTENANCE_MODE:'on'})){
      await s.set({env:{[key]:value}});const r=await s.get('/api/readiness');assert.equal(r.status,503,key);assert.equal((await r.json()).ok,false);
      assert.equal((await s.get('/api/health')).status,200);await s.set({env:{[key]:valid[key]||''}});
    }
    assert.equal((await s.get('/api/readiness')).status,200);
  }finally{await s.stop();}
});

test('hung database probe is bounded and concurrent requests are coalesced',async()=>{
  let calls=0,resolve;const probe=createReadinessProbe({env:valid,timeoutMs:20,ping:()=>{calls++;return new Promise(r=>{resolve=r;});}});
  const results=await Promise.all([probe(),probe(),probe()]);assert.equal(calls,1);assert.ok(results.every(r=>!r.ok&&!r.checks.database));
  assert.equal((await probe()).ok,false);assert.equal(calls,1);resolve(true);await new Promise(r=>setImmediate(r));
  const next=probe();await new Promise(r=>setImmediate(r));resolve(true);assert.equal((await next).ok,true);assert.equal(calls,2);
});
test('HTTP readiness timeout is 503 while health stays responsive',async()=>{
  const s=await server();try{await s.set({mode:'hang'});const started=Date.now();assert.equal((await s.get('/api/readiness')).status,503);assert.ok(Date.now()-started<4000);assert.equal((await s.get('/api/health')).status,200);}finally{await s.stop();}
});
test('SMTP readiness and explicitly enabled AI/billing require their configuration',()=>{
  const env={...valid,EMAIL_MODE:'smtp',SMTP_HOST:'smtp.example.test',SMTP_USER:'fixture',SMTP_PASSWORD:'synthetic',EMAIL_FROM:'sender@example.test'};
  assert.equal(readinessConfiguration(env).email,true);
  for(const key of ['SMTP_HOST','SMTP_USER','SMTP_PASSWORD','EMAIL_FROM'])assert.equal(readinessConfiguration({...env,[key]:''}).email,false);
  assert.equal(readinessConfiguration({...env,SMTP_PORT:'NaN'}).email,false);
  assert.equal(readinessConfiguration({...env,AI_MODE:'openai',OPENAI_API_KEY:'synthetic'}).ai,true);
  assert.equal(readinessConfiguration({...env,STRIPE_SECRET_KEY:'synthetic'}).stripe,false);
  assert.ok(Object.values(securityChecks(valid)).every(Boolean));
});
test('startup admission is process-local and a fresh probe must pass readiness again',async()=>{
  let ok=true;const read=async()=>({ok});const first=createStartupProbe(read);assert.equal((await first()).ok,true);ok=false;
  assert.equal((await first()).ok,true);assert.equal((await createStartupProbe(read)()).ok,false);
  assert.match(fs.readFileSync(path.join(root,'render.yaml'),'utf8'),/healthCheckPath: \/api\/startup/);
});

test('a late failed startup probe cannot undo successful admission',async()=>{
  const resolvers=[];const probe=createStartupProbe(()=>new Promise(resolve=>resolvers.push(resolve)));
  const first=probe(),second=probe();resolvers[0]({ok:true});assert.equal((await first).ok,true);
  resolvers[1]({ok:false});assert.equal((await second).ok,true);assert.equal((await probe()).ok,true);
});
