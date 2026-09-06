import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { before, after, test } from 'node:test';
import { chromium } from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const origin='http://127.0.0.1:32205/';
const token=version=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({id:1,tv:version})).toString('base64url')+'.synthetic';
let scratch,html,browser;
before(async()=>{
  scratch=fs.mkdtempSync(path.join(os.tmpdir(),'jovelya-account-browser-'));
  for(const name of ['server','public','package.json','render.yaml'])fs.cpSync(path.join(root,name),path.join(scratch,name),{recursive:true});
  function normalize(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())normalize(file);else if(/\.(js|html|json|yaml)$/.test(file))fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'));}}
  normalize(scratch);const pkg=JSON.parse(fs.readFileSync(path.join(scratch,'package.json')));
  for(let pass=0;pass<2;pass++)for(const command of [pkg.scripts['prepatch:public'],...pkg.scripts['patch:public'].split(' && ')]){
    const r=spawnSync(process.execPath,[command.slice(5)],{cwd:scratch,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  }
  html=fs.readFileSync(path.join(scratch,'public/index.html'),'utf8');
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
});
after(async()=>{await browser?.close();if(scratch)fs.rmSync(scratch,{recursive:true,force:true});});
async function until(condition){const end=Date.now()+5000;while(!condition()&&Date.now()<end)await new Promise(resolve=>setTimeout(resolve,10));assert.ok(condition());}
async function fixture(language,{clock=false}={}){
  const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:true,viewport:{width:375,height:800}}),page=await context.newPage();
  if(clock)await page.clock.install();
  const requests=[],errors=[];const control={mode:'ok',valid:token(0),held:null};
  const exported={exported_at:'2026-09-06T00:00:00Z',user:{id:1,email:'synthetic@example.test'},profiles:[{data_json:'{"name":"Synthetic"}'}],cvs:[{data_json:'{"photo":"synthetic-photo"}'}],letters:[{content:'synthetic-letter'}],applications:[{notes:'synthetic-job'}],ai_usage:[{request_count:3}],feedback:[{message:'synthetic-feedback'}],client_errors:[{stack:'synthetic-stack'}],beta_invite_uses:[{id:1}],excluded:['password_hashes_and_authentication_tokens','internal_audit_logs_and_staff_notes','administrative_invitation_records_and_codes','unsaved_forms_and_temporary_ats_interview_results','unlinked_feedback_and_diagnostics','provider_records_server_logs_and_backups']};
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(({language,initial})=>{if(!window.name){window.name='account-fixture';localStorage.setItem('cvf_token',initial);localStorage.setItem('cvf_lang',language);localStorage.setItem('cvf_theme','dark');}}, {language,initial:token(0)});
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());let data={ok:true};
    if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
    if(url.pathname==='/api/me'){
      if(request.headers().authorization!=='Bearer '+control.valid)return route.fulfill({status:401,contentType:'application/json',body:'{"error":"expired"}'});
      data={user:{id:1,email:'synthetic@example.test',plan:'free',email_verified:true}};
    }
    if(url.pathname==='/api/public/config')data={registration_mode:'open',billing_enabled:false,ai_enabled:false};
    if(url.pathname==='/api/cvs')data={cvs:[]};if(url.pathname==='/api/letters')data={letters:[]};if(url.pathname==='/api/applications')data={applications:[]};
    if(url.pathname.startsWith('/api/account')){
      requests.push({path:url.pathname,method:request.method(),body:request.postData()?request.postDataJSON():null});
      if(control.mode==='hold')await new Promise(resolve=>{control.held=resolve;});
      if(control.mode==='network')return route.abort('failed');
      if(['server','auth','blocked'].includes(control.mode))return route.fulfill({status:{server:500,auth:401,blocked:409}[control.mode],contentType:'application/json',body:'{"error":"PRIVATE detail"}'});
      if(control.mode==='html')return route.fulfill({contentType:'text/html',body:'<h1>PRIVATE detail</h1>'});
      if(url.pathname.endsWith('/change-password')){control.valid=token(1);data={token:control.valid};}
      if(url.pathname.endsWith('/logout-all')||request.method()==='DELETE')control.valid='';
      if(url.pathname.endsWith('/export'))data=exported;
      if(control.mode==='lost')return route.abort('failed');
    }
    await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto(origin);await page.evaluate(()=>show('account'));await page.waitForFunction(()=>document.getElementById('me').textContent.includes('@'));
  return {context,page,requests,errors,control,exported,async close(){await context.close();assert.deepEqual(errors,[]);}};
}
async function passwordFields(page){await page.locator('#accountCurrentPassword').fill('Synthetic-current');await page.locator('#accountNewPassword').fill('Synthetic-new-password');await page.locator('#accountRepeatPassword').fill('Synthetic-new-password');}
async function deleteFields(page,language){await page.locator('#accountDelete').click();await page.locator('#accountDeletePassword').fill('Synthetic-current');await page.locator('#accountDeletePhrase').fill(language==='ar'?'حذف':'SUPPRIMER');}
async function seededPrivate(page){await page.evaluate(()=>{$('fbMessage').value='PRIVATE-DRAFT';$('cvFullName').value='PRIVATE-DRAFT';localStorage.setItem('cvf_pending_letters_write','PRIVATE-DRAFT');sessionStorage.setItem('draft','PRIVATE-DRAFT');activeApplicationId=7;});}
async function cleaned(page,language){
  const state=await page.evaluate(()=>({stored:JSON.stringify({...localStorage,...sessionStorage}),values:[...document.querySelectorAll('input,textarea')].map(el=>el.value),id:activeApplicationId,theme:localStorage.getItem('cvf_theme'),lang:lang,focus:document.activeElement.id}));
  assert.ok(!state.stored.includes('PRIVATE-DRAFT'));assert.ok(!state.values.some(v=>v.includes('PRIVATE-DRAFT')));assert.equal(state.id,null);assert.equal(state.theme,'dark');assert.equal(state.lang,language);assert.equal(state.focus,'banner');
}
for(const language of ['fr','ar']){
  test(`account labels, keyboard cancellation and deletion confirmation are accessible (${language})`,async()=>{
    const f=await fixture(language);
    try {
      for(const id of ['accountCurrentPassword','accountNewPassword','accountRepeatPassword','accountDeletePassword','accountDeletePhrase'])assert.ok((await f.page.locator('label[for="'+id+'"]').textContent()).trim());
      await f.page.locator('#accountDelete').focus();await f.page.keyboard.press('Enter');assert.equal(await f.page.evaluate(()=>document.activeElement.id),'accountCancelDelete');
      assert.equal(await f.page.locator('#accountConfirmDelete').isDisabled(),true);
      await f.page.locator('#accountDeletePassword').fill('Synthetic-current');await f.page.locator('#accountDeletePhrase').fill('wrong');assert.equal(await f.page.locator('#accountConfirmDelete').isDisabled(),true);
      await f.page.keyboard.press('Enter');assert.equal(f.requests.length,0);
      assert.ok(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await f.page.keyboard.press('Escape');await f.page.waitForFunction(()=>!document.getElementById('accountDeleteDialog').open);
      assert.equal(await f.page.evaluate(()=>document.activeElement.id),'accountDelete');assert.equal(await f.page.locator('#accountDeletePassword').inputValue(),'');assert.equal(f.requests.length,0);
      await f.page.locator('#accountLogoutAll').click();await f.page.locator('#accountCancelLogout').click();assert.equal(f.requests.length,0);
      await f.page.locator('#accountChangePassword').click();assert.equal(f.requests.length,0);assert.equal(await f.page.locator('#accountCurrentPassword').getAttribute('aria-invalid'),'true');
      assert.ok((await f.page.locator('#accountActionStatus').textContent()).includes(language==='ar'?'تحقق':'Vérifiez'));
    }finally{await f.close();}
  });
  test(`password change is single-flight and installs the replacement token (${language})`,async()=>{
    const f=await fixture(language);
    try {
      await seededPrivate(f.page);await passwordFields(f.page);f.control.mode='hold';
      await f.page.evaluate(()=>{for(let i=0;i<3;i++)document.getElementById('accountPasswordForm').requestSubmit();});await until(()=>f.control.held);assert.equal(f.requests.length,1);
      const loaded=f.page.waitForEvent('load');f.control.mode='ok';f.control.held();await loaded;
      assert.equal(await f.page.evaluate(()=>localStorage.getItem('cvf_token')),token(1));await cleaned(f.page,language);
      assert.ok((await f.page.locator('#banner').textContent()).includes(language==='ar'?'تم تغيير':'Mot de passe modifié'));
      assert.equal(await f.page.locator('#accountCurrentPassword').inputValue(),'');
    }finally{await f.close();}
  });
  test(`logout-all requires confirmation and clears personal state (${language})`,async()=>{
    const f=await fixture(language);
    try {
      await seededPrivate(f.page);await f.page.locator('#accountLogoutAll').click();assert.equal(f.requests.length,0);f.control.mode='hold';
      await f.page.evaluate(()=>{const b=document.getElementById('accountConfirmLogout');b.click();b.click();});await until(()=>f.control.held);assert.equal(f.requests.length,1);
      const loaded=f.page.waitForEvent('load');f.control.mode='ok';f.control.held();await loaded;await cleaned(f.page,language);
      assert.equal(await f.page.evaluate(()=>localStorage.getItem('cvf_token')),null);assert.equal(await f.page.locator('#accountControls').isVisible(),false);
      assert.ok((await f.page.locator('#banner').textContent()).includes(language==='ar'?'جميع الأجهزة':'Tous les appareils'));
    }finally{await f.close();}
  });
  test(`deletion is explicit, single-flight, and clears personal state (${language})`,async()=>{
    const f=await fixture(language);
    try {
      await seededPrivate(f.page);await deleteFields(f.page,language);assert.ok((await f.page.locator('#accountDeleteHelp').textContent()).includes(language==='ar'?'معلومات شخصية':'informations personnelles'));
      f.control.mode='hold';await f.page.evaluate(()=>{const b=document.getElementById('accountConfirmDelete');b.click();b.click();});await until(()=>f.control.held);assert.equal(f.requests.length,1);assert.equal(f.requests[0].method,'DELETE');
      await f.page.keyboard.press('Escape');assert.equal(await f.page.locator('#accountDeleteDialog').evaluate(d=>d.open),true);
      const loaded=f.page.waitForEvent('load');f.control.mode='ok';f.control.held();await loaded;await cleaned(f.page,language);
      assert.equal(await f.page.evaluate(()=>localStorage.getItem('cvf_token')),null);assert.ok((await f.page.locator('#banner').textContent()).includes(language==='ar'?'تم حذف':'Compte supprimé'));
    }finally{await f.close();}
  });
  test(`export downloads all categories, announces success, and blocks repeated clicks (${language})`,async()=>{
    const f=await fixture(language);
    try {
      assert.ok((await f.page.locator('#accountExportExcluded').textContent()).includes(language==='ar'?'لا يشمل':'Exclus'));
      f.control.mode='hold';await f.page.evaluate(()=>{const b=document.getElementById('accountExport');b.click();b.click();});await until(()=>f.control.held);assert.equal(f.requests.length,1);
      const downloading=f.page.waitForEvent('download');f.control.mode='ok';f.control.held();const download=await downloading;
      assert.match(download.suggestedFilename(),/^jovelya-data-.*\.json$/);const file=path.join(scratch,'download-'+language+'.json');await download.saveAs(file);assert.deepEqual(JSON.parse(fs.readFileSync(file)),f.exported);
      assert.equal(await f.page.evaluate(()=>document.activeElement.id),'accountActionStatus');assert.ok((await f.page.locator('#accountActionStatus').textContent()).includes(language==='ar'?'تم تنزيل':'Export téléchargé'));
    }finally{await f.close();}
  });
  for(const action of ['password','logout','delete','export'])test(`${action}: network, HTTP and malformed responses are localized and retryable (${language})`,async()=>{
    const f=await fixture(language);
    try {
      if(action==='password')await passwordFields(f.page);if(action==='logout')await f.page.locator('#accountLogoutAll').click();if(action==='delete')await deleteFields(f.page,language);
      const button={password:'accountChangePassword',logout:'accountConfirmLogout',delete:'accountConfirmDelete',export:'accountExport'}[action];
      const status=action==='delete'?'#accountDeleteDialog .account-dialog-status':action==='logout'?'#accountLogoutDialog .account-dialog-status':'#accountActionStatus';
      for(const mode of ['network','server','html',...(action==='delete'?['blocked','auth']:action==='password'?['auth']:[])]){
        f.control.mode=mode;await f.page.locator('#'+button).click();await f.page.waitForFunction(()=>document.getElementById('accountControls').getAttribute('aria-busy')==='false');
        const message=await f.page.locator(status).textContent();assert.ok(message&&!message.includes('PRIVATE'));assert.ok(language==='ar'?/[\u0600-\u06ff]/.test(message):/[A-Za-zé]/.test(message));
        assert.equal(await f.page.evaluate(()=>localStorage.getItem('cvf_token')),token(0));
      }
      if(action==='password')assert.equal(await f.page.locator('#accountCurrentPassword').inputValue(),'Synthetic-current');
      if(action==='delete')assert.equal(await f.page.locator('#accountDeletePassword').inputValue(),'Synthetic-current');
      f.control.mode='ok';
      if(action==='export')await Promise.all([f.page.waitForEvent('download'),f.page.locator('#'+button).click()]);
      else {await Promise.all([f.page.waitForEvent('load'),f.page.locator('#'+button).click()]);assert.equal(await f.page.evaluate(()=>localStorage.getItem('cvf_token')),action==='password'?token(1):null);}
    }finally{await f.close();}
  });
  test(`a lost logout-all response clears an invalidated local session without claiming success (${language})`,async()=>{
    const f=await fixture(language);
    try {
      await seededPrivate(f.page);await f.page.locator('#accountLogoutAll').click();f.control.mode='lost';
      await Promise.all([f.page.waitForEvent('load'),f.page.locator('#accountConfirmLogout').click()]);await cleaned(f.page,language);
      assert.ok((await f.page.locator('#banner').textContent()).includes(language==='ar'?'للتحقق':'vérifier'));
    }finally{await f.close();}
  });
  test(`export timeout is controlled and announced (${language})`,async()=>{
    const f=await fixture(language,{clock:true});
    try {
      f.control.mode='hold';await f.page.locator('#accountExport').click();await until(()=>f.control.held);await f.page.clock.fastForward(15001);
      assert.ok((await f.page.locator('#accountActionStatus').textContent()).includes(language==='ar'?'مهلة':'délai'));assert.equal(await f.page.locator('#accountExport').isDisabled(),false);
      f.control.mode='server';f.control.held();
    }finally{await f.close();}
  });
}
