import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { before, after, test } from 'node:test';
import { chromium } from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const origin='http://127.0.0.1:32201/';
let scratch,html,browser;
before(async()=>{
  scratch=fs.mkdtempSync(path.join(os.tmpdir(),'jovelya-network-'));
  for(const name of ['server','public','package.json','render.yaml'])fs.cpSync(path.join(root,name),path.join(scratch,name),{recursive:true});
  function normalize(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())normalize(f);else if(/\.(js|html|json|yaml)$/.test(f))fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'));}}
  normalize(scratch);const pkg=JSON.parse(fs.readFileSync(path.join(scratch,'package.json')));
  for(let pass=0;pass<2;pass++)for(const command of [pkg.scripts['prepatch:public'],...pkg.scripts['patch:public'].split(' && ')]){
    const r=spawnSync(process.execPath,[command.slice(5)],{cwd:scratch,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  }
  html=fs.readFileSync(path.join(scratch,'public/index.html'),'utf8');
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
});
after(async()=>{await browser?.close();if(scratch)fs.rmSync(scratch,{recursive:true,force:true});});

async function fixture(key,language,{editing=false,clock=false}={}) {
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
  if(clock)await page.clock.install();
  const section=key==='letters'?'letters':'apps',save=key==='letters'?'saveLetterFinal':'saveApplicationFinal',remove=key==='letters'?'deleteLetterFinal':'deleteApplicationFinal';
  const record=key==='letters'?{id:7,title:'Original',company:'Original',target_role:'Role',content:'Original'}:{id:7,company:'Original',role:'Role',status:'Envoyée',applied_date:'',notes:'Original'};
  const rows=editing?[structuredClone(record)]:[],writes=[],errors=[];let nextId=8;
  const control={mode:'ok',readFailure:false,held:null,hangReadAfter:0,hungRead:null};
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.addInitScript(l=>{
    if(!window.name){window.name='network-fixture';localStorage.setItem('cvf_token','eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MX0.synthetic');localStorage.setItem('cvf_lang',l);}
  },language);
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),method=req.method();
    if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
    let data={ok:true};
    if(url.pathname==='/api/me')data={user:{id:1,email:'synthetic@example.test',email_verified:true,plan:'free'}};
    if(url.pathname==='/api/public/config')data={registration_mode:'open',billing_enabled:false,ai_enabled:false};
    if(url.pathname==='/api/cvs')data={cvs:[]};
    if(url.pathname==='/api/letters')data={letters:[]};
    if(url.pathname==='/api/applications')data={applications:[]};
    if(url.pathname==='/api/'+key&&method==='GET') {
      if(control.hangReadAfter&&--control.hangReadAfter===0){control.hungRead=route;return;}
      if(control.readFailure)return route.fulfill({status:503,body:'PRIVATE backend detail',contentType:'text/html'});
      data={[key]:rows};
    }
    if(url.pathname.startsWith('/api/'+key)&&method!=='GET') {
      const body=method==='DELETE'?null:req.postDataJSON();writes.push({method,path:url.pathname,body});
      if(control.mode==='hold') {await new Promise(resolve=>{control.held=resolve;});}
      if(control.mode==='network')return route.abort('failed');
      if(control.mode==='html200'||control.mode==='html503')return route.fulfill({status:control.mode==='html200'?200:503,contentType:'text/html',body:'<h1>PRIVATE backend detail</h1>'});
      if(control.mode==='json500')return route.fulfill({status:500,contentType:'application/json',body:'{"error":"PRIVATE backend detail"}'});
      const id=method==='POST'?nextId++:Number(url.pathname.split('/').pop());
      if(method==='DELETE'){const index=rows.findIndex(r=>r.id===id);if(index>=0)rows.splice(index,1);}
      else {const row={...body,id,target_role:body.targetRole};const index=rows.findIndex(r=>r.id===id);if(index<0)rows.push(row);else rows[index]=row;}
      data={ok:true,id};
      if(control.mode==='lost')return route.abort('failed');
      if(control.mode==='refresh')control.readFailure=true;
      if(control.mode==='hangRefresh')control.hangReadAfter=2;
    }
    await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto(origin);
  await page.evaluate(({section,key,record,editing})=>{show(section);if(editing)window[key==='letters'?'loadLetterIntoForm':'loadApplicationIntoForm'](record);}, {section,key,record,editing});
  const fields=key==='letters'?['letterTitle','letterCompany','letterRole','letterContent']:['appCompany','appRole','appNotes'];
  for(const id of fields)await page.locator('#'+id).fill('Draft '+id);
  const values=()=>page.evaluate(ids=>ids.map(id=>document.getElementById(id).value),fields);
  const originalValues=await values();
  const status=page.locator('#'+section+'RequestStatus');
  return {context,page,section,key,save,remove,control,rows,writes,errors,values,originalValues,status,fields,
    async submit(){await page.evaluate(name=>window[name](),save);},
    async retry(){await status.locator('button').click();await page.waitForFunction(id=>!document.querySelector('#'+id+' button')?.disabled,section+'RequestStatus');},
    async intact(){assert.deepEqual(await values(),originalValues);assert.ok(!(await status.textContent()).includes('PRIVATE'));},
    async close(){await context.close();assert.deepEqual(errors,[]);}
  };
}
const expected=(lang,kind)=>({fr:{network:'Connexion impossible',server:'serveur est indisponible',format:'serveur illisible',timeout:'délai de réponse',saved:'Enregistrement confirmé',unknown:'Création non confirmée',refresh:'Opération confirmée'},ar:{network:'تعذر الاتصال',server:'الخادم غير متاح',format:'تعذر قراءة',timeout:'انتهت مهلة',saved:'تم تأكيد الحفظ',unknown:'لم يتم تأكيد الإنشاء',refresh:'تم تأكيد العملية'}}[lang][kind]);
async function until(condition) {const deadline=Date.now()+5000;while(!condition()&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));assert.ok(condition(),'Expected request did not arrive');}
for(const language of ['fr','ar'])for(const key of ['letters','applications']) {
  test(`${key}: offline new save preserves input; retry/clicks create exactly once (${language})`,async()=>{
    const f=await fixture(key,language);
    try {
      await f.context.setOffline(true);await f.submit();await f.intact();assert.match(await f.status.textContent(),new RegExp(expected(language,'network')));assert.equal(f.writes.length,0);
      await f.context.setOffline(false);f.control.mode='hold';
      await f.page.evaluate(name=>{window[name]();window[name]();window[name]();},f.save);
      await until(()=>f.control.held);assert.equal(f.writes.length,1);
      f.control.mode='ok';f.control.held();await f.page.waitForFunction(id=>document.getElementById(id).textContent.includes(document.documentElement.lang==='ar'?'تم تأكيد الحفظ':'Enregistrement confirmé'),f.section+'RequestStatus');
      await f.submit();assert.equal(f.writes.length,1);assert.equal(f.rows.length,1);await f.intact();
    }finally{await f.close();}
  });
  test(`${key}: Failed to fetch on update preserves identity and input; retry is PUT (${language})`,async()=>{
    const f=await fixture(key,language,{editing:true});
    try {
      f.control.mode='network';await f.submit();await f.intact();assert.match(await f.status.textContent(),new RegExp(expected(language,'network')));assert.equal(f.rows[0].company,'Original');
      f.control.mode='ok';await f.retry();assert.deepEqual(f.writes.map(w=>w.method),['PUT','PUT']);assert.ok(f.writes.every(w=>w.path.endsWith('/7')));assert.equal(f.rows.length,1);await f.intact();
    }finally{await f.close();}
  });
  test(`${key}: lost creation response is reconciled without another POST (${language})`,async()=>{
    const f=await fixture(key,language);
    try {
      f.control.mode='lost';await f.submit();await f.intact();assert.equal(f.rows.length,1);
      f.control.mode='ok';await f.retry();assert.equal(f.writes.length,1);assert.match(await f.status.textContent(),new RegExp(expected(language,'saved')));await f.submit();assert.equal(f.writes.length,1);
    }finally{await f.close();}
  });
  test(`${key}: uncertain creation cannot be blindly retried, including after reload (${language})`,async()=>{
    const f=await fixture(key,language);
    try {
      f.control.mode='network';await f.submit();await f.intact();f.control.mode='ok';
      await f.retry();await f.retry();assert.equal(f.writes.length,1);assert.match(await f.status.textContent(),new RegExp(expected(language,'unknown')));
      await f.page.reload();await f.page.evaluate(id=>show(id),f.section);await f.intact();await f.retry();assert.equal(f.writes.length,1);assert.equal(f.rows.length,0);
    }finally{await f.close();}
  });
  test(`${key}: non-JSON success, HTML 503 and JSON 500 are localized and retryable (${language})`,async()=>{
    const f=await fixture(key,language,{editing:true});
    try {
      for(const mode of ['html200','html503','json500']) {
        f.control.mode=mode;await f.submit();await f.intact();assert.match(await f.status.textContent(),new RegExp(expected(language,mode==='html200'?'format':'server')));
      }
      f.control.mode='ok';await f.retry();assert.equal(f.rows.length,1);assert.ok(f.writes.every(w=>w.method==='PUT'));await f.intact();
    }finally{await f.close();}
  });
  test(`${key}: delete failure retains form/ID and retry deletes once (${language})`,async()=>{
    const f=await fixture(key,language,{editing:true});
    try {
      for(const mode of ['network','html503']){f.control.mode=mode;await f.page.evaluate(name=>window[name](7),f.remove);await f.intact();assert.equal(f.rows.length,1);}
      const id=await f.page.evaluate(k=>k==='letters'?activeLetterId:activeApplicationId,key);assert.equal(id,7);
      f.control.mode='ok';await f.retry();assert.equal(f.rows.length,0);await f.page.evaluate(name=>window[name](7),f.remove);assert.equal(f.writes.length,3);
    }finally{await f.close();}
  });
  test(`${key}: timeout retains input and has a safe retry path (${language})`,async()=>{
    const f=await fixture(key,language,{editing:true,clock:true});
    try {
      f.control.mode='hold';await f.page.evaluate(name=>{window[name]();},f.save);await until(()=>f.control.held);
      await f.page.clock.fastForward(15001);await f.intact();assert.match(await f.status.textContent(),new RegExp(expected(language,'timeout')));
      f.control.mode='ok';f.control.held();await f.retry();assert.equal(f.rows.length,1);assert.ok(f.writes.every(w=>w.method==='PUT'));
    }finally{await f.close();}
  });
  test(`${key}: failed refresh never resubmits a confirmed save (${language})`,async()=>{
    const f=await fixture(key,language);
    try {
      f.control.mode='refresh';await f.submit();await f.intact();assert.match(await f.status.textContent(),new RegExp(expected(language,'refresh')));
      f.control.mode='ok';f.control.readFailure=false;await f.retry();await f.submit();assert.equal(f.writes.length,1);assert.equal(f.rows.length,1);
    }finally{await f.close();}
  });
  test(`${key}: New during an in-flight save cannot regain the old edit identity (${language})`,async()=>{
    const f=await fixture(key,language);
    try {
      f.control.mode='hold';await f.page.evaluate(name=>{window[name]();},f.save);await until(()=>f.control.held);
      await f.page.evaluate(key=>window[key==='letters'?'clearLetterForm':'clearApplicationForm'](),key);
      for(const id of f.fields)await f.page.locator('#'+id).fill('Next '+id);
      f.control.mode='ok';f.control.held();await f.page.waitForFunction(id=>!document.querySelector('#'+id+' button.primary').disabled,f.section);
      assert.equal(await f.page.evaluate(key=>key==='letters'?activeLetterId:activeApplicationId,key),null);
      await f.submit();assert.deepEqual(f.writes.map(w=>w.method),['POST','POST']);assert.equal(f.rows.length,2);assert.ok((await f.values()).every(v=>v.startsWith('Next ')));
    }finally{await f.close();}
  });
  test(`${key}: logout removes an uncertain private write and its retry state (${language})`,async()=>{
    const f=await fixture(key,language);
    try {
      f.control.mode='network';await f.submit();assert.ok(await f.page.evaluate(k=>localStorage.getItem('cvf_pending_'+k+'_write'),key));
      await Promise.all([f.page.waitForEvent('load'),f.page.evaluate(()=>logout())]);
      assert.equal(await f.page.evaluate(k=>localStorage.getItem('cvf_pending_'+k+'_write'),key),null);
      assert.ok((await f.values()).every(v=>v===''));await f.submit();assert.equal(f.writes.length,1);
    }finally{await f.close();}
  });
  test(`${key}: a hanging renderer refresh times out without repeating the write (${language})`,async()=>{
    const f=await fixture(key,language,{clock:true});
    try {
      f.control.mode='hangRefresh';await f.page.evaluate(name=>{window[name]();},f.save);await until(()=>f.control.hungRead);
      await f.page.clock.fastForward(15001);await f.intact();assert.match(await f.status.textContent(),new RegExp(expected(language,'refresh')));
      assert.equal(await f.page.locator('#'+f.section+' button.primary').isDisabled(),false);
      f.control.mode='ok';await f.control.hungRead.fulfill({contentType:'application/json',body:JSON.stringify({[key]:f.rows})});
      await f.retry();await f.submit();assert.equal(f.writes.length,1);
    }finally{await f.close();}
  });
}
