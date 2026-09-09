import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const schema='account_test_'+randomBytes(8).toString('hex');
const secret='synthetic-account-regression-secret-only-123456';
const password='Synthetic-current-password';
const signed=id=>jwt.sign({id,tv:0},secret);
let db,appDb,httpServer,scratch,base;
let previousEnv,previousSignals;
before(async()=>{
  assert.equal(process.env.NODE_ENV,'test');
  const url=new URL(process.env.TEST_DATABASE_URL);
  assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname));
  assert.ok(url.port&&url.port!=='5432');
  assert.ok([...url.searchParams.keys()].every(key=>key==='sslmode'));
  url.searchParams.set('options','-c search_path='+schema);
  db=new pg.Pool({connectionString:url.toString(),ssl:false});
  await db.query(`CREATE SCHEMA ${schema}`);
  await db.query(fs.readFileSync(path.join(root,'server/migrations/001_application.sql'),'utf8').replaceAll('public.',schema+'.'));
  scratch=fs.mkdtempSync(path.join(os.tmpdir(),'jovelya-account-backend-'));
  fs.cpSync(path.join(root,'server'),path.join(scratch,'server'),{recursive:true});
  fs.writeFileSync(path.join(scratch,'package.json'),'{"type":"module"}');
  fs.symlinkSync(path.join(root,'node_modules'),path.join(scratch,'node_modules'),'junction');
  const source=path.join(scratch,'server/index.js');fs.writeFileSync(source,fs.readFileSync(source,'utf8').replace(/\r\n/g,'\n'));
  const build=spawnSync(process.execPath,['server/pg-transform.js'],{cwd:scratch,encoding:'utf8',windowsHide:true});assert.equal(build.status,0,build.stderr);
  // node --test already isolates this file in its own process. Start the real
  // generated application here rather than adding another cold process and an
  // IPC readiness dependency. Keep the same 10-second startup deadline.
  const fixtureEnv={DATABASE_URL:url.toString(),PORT:'0',JWT_SECRET:secret,NODE_ENV:'test',APP_STAGE:'test',MAINTENANCE_MODE:'off',ALLOWED_ORIGIN:'',STRIPE_SECRET_KEY:'',EMAIL_MODE:'console',DOTENV_CONFIG_PATH:path.join(scratch,'absent.env')};
  previousEnv=Object.fromEntries(Object.keys(fixtureEnv).map(key=>[key,process.env[key]]));
  previousSignals=new Map(['SIGTERM','SIGINT'].map(signal=>[signal,process.listeners(signal)]));
  Object.assign(process.env,fixtureEnv);
  const originalListen=express.application.listen;
  let timer,resolveListening,rejectListening;
  const listening=new Promise((resolve,reject)=>{resolveListening=resolve;rejectListening=reject;});
  // Handle an early socket error even while the module import is still pending.
  listening.catch(()=>{});
  express.application.listen=function(...args){
    httpServer=originalListen.apply(this,args);
    httpServer.once('error',rejectListening);
    httpServer.once('listening',()=>resolveListening(httpServer.address().port));
    return httpServer;
  };
  try {
    const startup=(async()=>{
      appDb=(await import(pathToFileURL(path.join(scratch,'server/db.js')).href)).default;
      await import(pathToFileURL(path.join(scratch,'server/index.pg.generated.js')).href);
      return listening;
    })();
    const port=await Promise.race([startup,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error('Test server startup timeout')),10000);
    })]);
    assert.ok(Number.isInteger(port)&&port>0,'Real HTTP server must be listening');
    base='http://127.0.0.1:'+port;
  } finally {
    clearTimeout(timer);
    express.application.listen=originalListen;
  }
});
after(async()=>{
  if(httpServer) {
    const closed=new Promise((resolve,reject)=>httpServer.close(error=>error?reject(error):resolve()));
    httpServer.closeAllConnections();await closed;
  }
  if(appDb)await appDb.close();
  if(previousSignals)for(const [signal,original] of previousSignals)for(const listener of process.listeners(signal))if(!original.includes(listener))process.removeListener(signal,listener);
  if(previousEnv)for(const [key,value] of Object.entries(previousEnv)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  if(db){await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await db.end();}
  if(scratch)fs.rmSync(scratch,{recursive:true,force:true});
});
beforeEach(async()=>{
  await db.query('TRUNCATE users,feedback,client_errors,audit_log,beta_invites RESTART IDENTITY CASCADE');
  const hash=await bcrypt.hash(password,4);
  for(const id of [1,2]){
    const marker=id===1?'OWN':'OTHER';
    await db.query('INSERT INTO users(email,password_hash,email_verified) VALUES($1,$2,true)',[marker+'@example.test',hash]);
    await db.query('INSERT INTO profiles(user_id,data_json) VALUES($1,$2)',[id,JSON.stringify({name:marker})]);
    await db.query('INSERT INTO cv_documents(user_id,title,data_json) VALUES($1,$2,$3)',[id,marker,JSON.stringify({photo:marker+'-photo',skills:marker})]);
    await db.query('INSERT INTO cover_letters(user_id,title,content) VALUES($1,$2,$2)',[id,marker]);
    await db.query('INSERT INTO applications(user_id,company,role) VALUES($1,$2,$2)',[id,marker]);
    await db.query('INSERT INTO ai_usage(user_id,usage_date,request_count) VALUES($1,CURRENT_DATE,3)',[id]);
    await db.query('INSERT INTO feedback(user_id,message,admin_note) VALUES($1,$2,$3)',[id,marker+'-feedback','STAFF-SECRET']);
    await db.query('INSERT INTO client_errors(user_id,message,stack,user_agent) VALUES($1,$2,$3,$4)',[id,marker+'-diagnostic',marker+'-stack',marker+'-agent']);
    await db.query('INSERT INTO audit_log(user_id,event_type,event_data) VALUES($1,$2,$3)',[id,'test','AUDIT-SECRET']);
    await db.query('INSERT INTO beta_invites(code,created_by) VALUES($1,$2)',[marker+'-INVITE-SECRET',id]);
    await db.query('INSERT INTO beta_invite_uses(user_id,invite_id) VALUES($1,$1)',[id]);
    for(const table of ['password_reset_tokens','email_verification_tokens'])await db.query(`INSERT INTO ${table}(user_id,token_hash,expires_at) VALUES($1,$2,CURRENT_TIMESTAMP+interval '30 minutes')`,[id,marker+'-TOKEN-SECRET']);
  }
  await db.query("INSERT INTO feedback(message) VALUES('UNLINKED-SECRET')");
  await db.query("INSERT INTO client_errors(message) VALUES('UNLINKED-SECRET')");
});
async function request(route,{method='GET',body,token=signed(1),language='fr'}={}){
  return fetch(base+route,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json','accept-language':language},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
}
for(const language of ['fr','ar']) {
  test(`password change validates credentials and preserves token-version rules (${language})`,async()=>{
    assert.equal((await request('/api/account/change-password',{method:'POST',body:{currentPassword:'wrong',newPassword:'Synthetic-new-password'},language})).status,401);
    assert.equal((await request('/api/account/change-password',{method:'POST',body:{currentPassword:password,newPassword:'short'},language})).status,400);
    const r=await request('/api/account/change-password',{method:'POST',body:{currentPassword:password,newPassword:'Synthetic-new-password'},language});assert.equal(r.status,200);const data=await r.json();
    assert.equal(jwt.verify(data.token,secret).tv,1);assert.equal((await request('/api/me',{language})).status,401);assert.equal((await request('/api/me',{token:data.token,language})).status,200);
    const user=(await db.query('SELECT * FROM users WHERE id=1')).rows[0];assert.ok(await bcrypt.compare('Synthetic-new-password',user.password_hash));assert.equal((await request('/api/me',{token:signed(2),language})).status,200);
  });
  test(`logout-all invalidates devices and rejects reuse (${language})`,async()=>{
    const secondDevice=jwt.sign({id:1,tv:0,device:'synthetic'},secret);
    assert.equal((await request('/api/account/logout-all',{method:'POST',language})).status,200);
    assert.equal((await request('/api/me',{token:secondDevice,language})).status,401);
    assert.equal((await request('/api/account/logout-all',{method:'POST',language})).status,401);
    assert.equal((await db.query('SELECT token_version FROM users WHERE id=1')).rows[0].token_version,1);
    assert.equal((await request('/api/me',{token:signed(2),language})).status,200);
  });
  test(`export includes every promised category and isolates the authenticated user (${language})`,async()=>{
    const r=await request('/api/account/export?user_id=2',{language});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const data=await r.json();
    for(const key of ['profiles','cvs','letters','applications','ai_usage','feedback','client_errors','beta_invite_uses'])assert.equal(data[key].length,1,key);
    assert.equal(data.user.email,'OWN@example.test');assert.equal(JSON.parse(data.cvs[0].data_json).photo,'OWN-photo');assert.equal(data.feedback[0].message,'OWN-feedback');assert.equal(data.client_errors[0].stack,'OWN-stack');
    assert.ok(!('password_hash' in data.user));assert.ok(!('token_version' in data.user));assert.ok(!('admin_note' in data.feedback[0]));
    const encoded=JSON.stringify(data);for(const excluded of ['OTHER','STAFF-SECRET','AUDIT-SECRET','TOKEN-SECRET','INVITE-SECRET','UNLINKED-SECRET'])assert.ok(!encoded.includes(excluded),excluded);
    assert.equal(data.excluded.length,6);assert.equal((await request('/api/account/export',{token:'invalid',language})).status,401);
  });
  test(`deletion requires password, respects subscription guard and keeps existing cascades (${language})`,async()=>{
    assert.equal((await request('/api/account',{method:'DELETE',body:{password:'wrong'},language})).status,401);
    await db.query("UPDATE users SET stripe_subscription_id='synthetic-sub' WHERE id=1");
    assert.equal((await request('/api/account',{method:'DELETE',body:{password},language})).status,409);
    await db.query('UPDATE users SET stripe_subscription_id=NULL WHERE id=1');
    assert.equal((await request('/api/account',{method:'DELETE',body:{password},language})).status,200);
    assert.equal((await request('/api/account',{method:'DELETE',body:{password},language})).status,401);
    for(const table of ['users','profiles','cv_documents','cover_letters','applications','ai_usage','password_reset_tokens','email_verification_tokens','beta_invite_uses'])assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${table==='users'?'id':'user_id'}=1`)).rows[0].n,0,table);
    for(const table of ['feedback','client_errors','audit_log'])assert.equal((await db.query(`SELECT user_id FROM ${table} WHERE id=1`)).rows[0].user_id,null);
    assert.equal((await db.query('SELECT message FROM feedback WHERE id=1')).rows[0].message,'OWN-feedback');assert.equal((await request('/api/me',{token:signed(2),language})).status,200);
  });
  test(`dependency failures are controlled and leave account data consistent (${language})`,async()=>{
    await db.query(`CREATE FUNCTION fail_account() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'PRIVATE failure'; END $$`);
    await db.query('CREATE TRIGGER fail_account BEFORE UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION fail_account()');
    try {
      for(const [route,body] of [['change-password',{currentPassword:password,newPassword:'Synthetic-new-password'}],['logout-all',{}],['',{password}]]){
        const r=await request('/api/account'+(route?'/'+route:''),{method:route?'POST':'DELETE',body,language});assert.equal(r.status,500);assert.ok(!(await r.text()).includes('PRIVATE'));
        assert.equal((await request('/api/health',{language})).status,200);assert.equal((await request('/api/me',{language})).status,200);
      }
      const user=(await db.query('SELECT * FROM users WHERE id=1')).rows[0];assert.equal(user.token_version,0);assert.ok(await bcrypt.compare(password,user.password_hash));
    }finally{await db.query('DROP TRIGGER fail_account ON users');await db.query('DROP FUNCTION fail_account()');}
    await db.query('ALTER TABLE client_errors RENAME TO held_client_errors');
    try {const r=await request('/api/account/export',{language});assert.equal(r.status,500);assert.ok(!(await r.text()).includes('held_client_errors'));assert.equal((await request('/api/health',{language})).status,200);}
    finally{await db.query('ALTER TABLE held_client_errors RENAME TO client_errors');}
  });
}
