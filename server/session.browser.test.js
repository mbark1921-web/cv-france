import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { before, after, test } from 'node:test';
import { chromium } from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const jwt=id=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({id})).toString('base64url')+'.synthetic';
const secret='PRIVATE-USER-A';
// A loopback origin enables the real Cache API; all requests are intercepted.
const origin='http://127.0.0.1:32199/';
let scratch,browser,html;
before(async()=>{
  scratch=fs.mkdtempSync(path.join(os.tmpdir(),'jovelya-session-'));
  for(const name of ['server','public','package.json','render.yaml'])fs.cpSync(path.join(root,name),path.join(scratch,name),{recursive:true});
  function normalize(dir) {for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())normalize(f);else if(/\.(js|html|json|yaml)$/.test(f))fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'));}}
  normalize(scratch);
  const pkg=JSON.parse(fs.readFileSync(path.join(scratch,'package.json')));
  for(let pass=0;pass<2;pass++)for(const command of [pkg.scripts['prepatch:public'],...pkg.scripts['patch:public'].split(' && ')]) {
    const r=spawnSync(process.execPath,[command.slice(5)],{cwd:scratch,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  }
  html=fs.readFileSync(path.join(scratch,'public/index.html'),'utf8');
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
});
after(async()=>{await browser?.close();if(scratch)fs.rmSync(scratch,{recursive:true,force:true});});

async function fixture(language) {
  const context=await browser.newContext({serviceWorkers:'block'});
  const writes=[],errors=[];
  const cv={id:7,title:secret,target_role:secret,is_primary:true,data:{fullName:secret,profile:secret,skills:'commerce accueil organisation vente gestion',email:'PRIVATE-USER-A@example.test',photo:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9XkAAAAASUVORK5CYII='}};
  const letter={id:7,title:secret,company:secret,target_role:secret,content:secret};
  const application={id:7,company:secret,role:secret,status:'Envoyée',notes:secret,applied_date:'2026-09-01'};
  const records={1:{cvs:[cv],letters:[letter],applications:[application]},2:{cvs:[],letters:[],applications:[]}};
  let delayed=null;
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),method=req.method();
    if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
    if(url.pathname==='/api/delayed') {delayed=route;return;}
    const id=req.headers().authorization==='Bearer '+jwt(1)?1:2;
    let data={ok:true};
    if(url.pathname==='/api/auth/login')data={token:jwt(req.postDataJSON().email==='a@example.test'?1:2)};
    if(url.pathname==='/api/me')data={user:{id,email:id===1?secret+'@example.test':'b@example.test',email_verified:true,plan:'free'}};
    if(url.pathname==='/api/public/config')data={registration_mode:'open',billing_enabled:false,ai_enabled:false};
    const resource=url.pathname.match(/^\/api\/(cvs|letters|applications)(?:\/(\d+))?$/);
    if(resource) {
      const key=resource[1];
      if(method==='GET')data={[key]:records[id][key]};
      else {
        const body=req.postDataJSON();writes.push({id,key,method,path:url.pathname,body});
        const recordId=resource[2]?Number(resource[2]):8;
        const row={...body,id:recordId,target_role:body.targetRole||body.role};
        records[id][key]=[row];data={id:recordId,ok:true};
      }
    }
    await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);
  await page.evaluate(l=>{localStorage.setItem('cvf_lang',l);localStorage.setItem('cvf_theme','dark');lang=l;applyLang();},language);
  return {context,page,writes,errors,records,cv,letter,application,get delayed(){return delayed;}};
}
async function login(page,email) {
  await page.evaluate(()=>show('account'));
  // Programmatic values also allow exercising a direct account switch while connected.
  await page.evaluate(email=>{$('logEmail').value=email;$('logPass').value='synthetic-password';},email);
  await Promise.all([page.waitForEvent('load'),page.evaluate(()=>login())]);
  await page.waitForFunction(()=>document.getElementById('me').textContent.includes('@'));
}
async function loadPrivate(f) {
  await f.page.evaluate(async({cv,letter,application})=>{
    window.loadCvIntoForm(cv);window.loadLetterIntoForm(letter);window.loadApplicationIntoForm(application);
    $('interviewRole').value=cv.title;generateInterview();
    $('atsOffer').value='commerce accueil organisation vente gestion';atsCvs=[cv];
    atsLast={score:73,found:[cv.title],missing:[cv.title]};renderAts(atsLast);
    $('fbMessage').value=cv.title;sessionStorage.setItem('feedbackDraft',cv.title);
    localStorage.setItem('oldPrivateDraft',cv.title);
    const cache=await caches.open('private-fixture');await cache.put('/private-fixture',new Response(cv.title));
  },{cv:f.cv,letter:f.letter,application:f.application});
  await f.page.evaluate(async()=>{await saveCvFinal();await saveLetterFinal();await saveApplicationFinal();});
  assert.deepEqual(f.writes.map(w=>w.method),['PUT','PUT','PUT']);
  assert.ok((await f.page.locator('#cvPreview').textContent()).includes(secret));
}
async function clean(page,language) {
  const state=await page.evaluate(()=>({
    html:document.body.innerHTML,values:[...document.querySelectorAll('input,textarea,select')].map(e=>e.value),
    ids:[activeCvId,activeLetterId,activeApplicationId,window.activeApplicationId??null],
    storage:JSON.stringify({...localStorage,...sessionStorage}),lang:document.documentElement.lang,dir:document.documentElement.dir,
    theme:localStorage.getItem('cvf_theme'),photo:cvBody().data.photo,ats:atsLast
  }));
  assert.ok(!state.html.includes(secret));assert.ok(!state.values.some(v=>v.includes(secret)));assert.ok(!state.storage.includes(secret));
  assert.deepEqual(state.ids,[null,null,null,null]);assert.equal(state.photo,'');assert.equal(state.ats,null);
  assert.equal(state.lang,language);assert.equal(state.dir,language==='ar'?'rtl':'ltr');assert.equal(state.theme,'dark');
  for(const key of ['cvf_active_cv_id','cvf_active_letter_id','cvf_active_application_id','oldPrivateDraft','feedbackDraft'])assert.ok(!state.storage.includes(key));
}
for(const language of ['fr','ar']) {
  test(`persisted edits belong only to their account; legacy IDs are discarded (${language})`,async()=>{
    const f=await fixture(language);
    try {
      await f.page.addInitScript(({a,b})=>{
        if(location.search==='?seed=1') {
          localStorage.setItem('cvf_token',a);
          for(const key of ['cvf_active_cv_id','cvf_active_letter_id','cvf_active_application_id'])localStorage.setItem(key,'7');
          history.replaceState(null,'','/');
        } else if(location.search==='?switch=1') {
          // Another tab has claimed shared storage while this tab was suspended.
          localStorage.setItem('cvf_token',b);localStorage.setItem('cvf_state_owner','user:2');
          for(const key of ['cvf_active_cv_id','cvf_active_letter_id','cvf_active_application_id','oldPrivateDraft'])localStorage.removeItem(key);
          history.replaceState(null,'','/');
        }
      },{a:jwt(1),b:jwt(2)});
      await f.page.goto(origin+'?seed=1');
      assert.deepEqual(await f.page.evaluate(()=>['cvf_active_cv_id','cvf_active_letter_id','cvf_active_application_id'].map(k=>localStorage.getItem(k))),[null,null,null]);
      assert.deepEqual(await f.page.evaluate(()=>[activeCvId,activeLetterId,activeApplicationId]),[null,null,null]);
      await loadPrivate(f);
      await f.page.reload();
      assert.deepEqual(await f.page.evaluate(()=>['cvf_active_cv_id','cvf_active_letter_id','cvf_active_application_id'].map(k=>localStorage.getItem(k))),['7','7','7']);
      await f.page.goto(origin+'?switch=1');await clean(f.page,language);assert.deepEqual(f.errors,[]);
    } finally {await f.context.close();}
  });
  test(`logout clears every workflow; B creates new records without A data (${language})`,async()=>{
    const f=await fixture(language);
    try {
      await login(f.page,'a@example.test');await loadPrivate(f);
      await Promise.all([f.page.waitForEvent('load'),f.page.evaluate(()=>logout())]);
      await clean(f.page,language);
      assert.deepEqual(await f.page.evaluate(()=>caches.keys()),[]);
      assert.equal(await f.page.evaluate(()=>localStorage.getItem('cvf_token')),null);
      await login(f.page,'b@example.test');await clean(f.page,language);
      await f.page.evaluate(async()=>{await saveCvFinal();await saveLetterFinal();$('appCompany').value='B';$('appRole').value='B';await saveApplicationFinal();});
      const b=f.writes.filter(w=>w.id===2);assert.equal(b.length,3);
      assert.ok(b.every(w=>w.method==='POST'&&!JSON.stringify(w.body).includes('PRIVATE-USER-A')));
      assert.ok(f.records[1].cvs[0].title.includes(secret));assert.deepEqual(f.errors,[]);
    } finally {await f.context.close();}
  });
  test(`direct account switch and other tabs discard A state (${language})`,async()=>{
    const f=await fixture(language);
    try {
      await login(f.page,'a@example.test');await loadPrivate(f);
      const other=await f.context.newPage();await other.goto(origin);
      await other.evaluate(()=>{$('fbMessage').value='PRIVATE-USER-A';});
      const changed=other.waitForEvent('load');await login(f.page,'b@example.test');await changed;
      await clean(f.page,language);await clean(other,language);assert.deepEqual(f.errors,[]);
    } finally {await f.context.close();}
  });
  test(`late previous-session response cannot restore content (${language})`,async()=>{
    const f=await fixture(language);
    try {
      await login(f.page,'a@example.test');
      await f.page.evaluate(()=>{fetch('/api/delayed').then(r=>r.json()).then(d=>{$('fbMessage').value=d.private;localStorage.setItem('lateDraft',d.private);});});
      await f.page.waitForTimeout(50);assert.ok(f.delayed);
      await Promise.all([f.page.waitForEvent('load'),f.page.evaluate(()=>logout())]);
      await f.delayed.fulfill({contentType:'application/json',body:JSON.stringify({private:secret})}).catch(()=>{});
      await login(f.page,'b@example.test');await clean(f.page,language);assert.deepEqual(f.errors,[]);
    } finally {await f.context.close();}
  });
}
