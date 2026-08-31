import fs from 'fs';
import path from 'path';

const file = path.resolve('public/index.html');
let html = fs.readFileSync(file, 'utf8');
const marker = 'PASSWORD_RESET_UI_V20_2_8';

if (!html.includes(marker)) {
  html = html.replace(
    '</body></html>',
    `<script>/* ${marker} */
function ensurePasswordResetButton(){
  const email=document.getElementById('logEmail');
  if(!email)return;
  let btn=document.getElementById('passwordResetBtn');
  if(!btn){
    btn=document.createElement('button');
    btn.id='passwordResetBtn';
    btn.type='button';
    btn.onclick=requestPasswordResetUI;
    const loginBtn=email.parentElement?.querySelector('button[onclick="login()"]');
    const logoutBtn=email.parentElement?.querySelector('button[onclick="logout()"]');
    if(logoutBtn)logoutBtn.insertAdjacentElement('afterend',btn);
    else if(loginBtn)loginBtn.insertAdjacentElement('afterend',btn);
    else email.insertAdjacentElement('afterend',btn);
  }
  btn.textContent=lang==='ar'?'نسيت كلمة المرور؟':'Mot de passe oublié ?';
}

async function requestPasswordResetUI(){
  const email=v('logEmail');
  if(!email){
    note(lang==='ar'?'اكتب بريدك الإلكتروني أولاً.':'Saisissez d’abord votre e-mail.',true);
    return;
  }
  try{
    const r=await fetch(A+'/auth/request-password-reset',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email})
    });
    const d=await r.json();
    note(d.message||d.error||T[lang].serverError,!r.ok);
  }catch{
    note(T[lang].serverError,true);
  }
}

function getResetToken(){
  return new URLSearchParams(window.location.search).get('reset')||'';
}

function ensurePasswordResetForm(){
  const resetToken=getResetToken();
  let panel=document.getElementById('passwordResetPanel');

  if(!resetToken){
    if(panel)panel.remove();
    return;
  }

  const account=document.getElementById('account');
  if(!account)return;

  if(!panel){
    panel=document.createElement('div');
    panel.id='passwordResetPanel';
    panel.className='card';
    panel.innerHTML=''
      +'<h3 id="passwordResetTitle"></h3>'
      +'<p id="passwordResetHelp" class="muted"></p>'
      +'<input id="resetNewPassword" type="password" autocomplete="new-password">'
      +'<input id="resetConfirmPassword" type="password" autocomplete="new-password">'
      +'<button id="passwordResetConfirmBtn" class="primary" type="button"></button>';
    account.insertAdjacentElement('afterbegin',panel);
    document.getElementById('passwordResetConfirmBtn').onclick=confirmPasswordResetUI;
  }

  document.getElementById('passwordResetTitle').textContent=
    lang==='ar'?'تعيين كلمة مرور جديدة':'Nouveau mot de passe';
  document.getElementById('passwordResetHelp').textContent=
    lang==='ar'?'اكتب كلمة مرور جديدة مكوّنة من 8 أحرف على الأقل.':'Choisissez un nouveau mot de passe de 8 caractères minimum.';
  document.getElementById('resetNewPassword').placeholder=
    lang==='ar'?'كلمة المرور الجديدة':'Nouveau mot de passe';
  document.getElementById('resetConfirmPassword').placeholder=
    lang==='ar'?'تأكيد كلمة المرور':'Confirmer le mot de passe';
  document.getElementById('passwordResetConfirmBtn').textContent=
    lang==='ar'?'حفظ كلمة المرور':'Enregistrer le nouveau mot de passe';

  show('account');
  panel.scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(()=>document.getElementById('resetNewPassword')?.focus(),100);
}

async function confirmPasswordResetUI(){
  const tokenValue=getResetToken();
  const first=document.getElementById('resetNewPassword')?.value||'';
  const second=document.getElementById('resetConfirmPassword')?.value||'';

  if(!tokenValue){
    note(lang==='ar'?'رابط إعادة التعيين غير صالح.':'Lien de réinitialisation invalide.',true);
    return;
  }
  if(first.length<8){
    note(lang==='ar'?'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.':'Le mot de passe doit contenir au moins 8 caractères.',true);
    return;
  }
  if(first!==second){
    note(lang==='ar'?'كلمتا المرور غير متطابقتين.':'Les deux mots de passe ne correspondent pas.',true);
    return;
  }

  const btn=document.getElementById('passwordResetConfirmBtn');
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(A+'/auth/reset-password',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({token:tokenValue,newPassword:first})
    });
    const d=await r.json();
    note(d.message||d.error||T[lang].serverError,!r.ok);
    if(r.ok){
      history.replaceState({},document.title,window.location.pathname);
      document.getElementById('passwordResetPanel')?.remove();
      document.getElementById('logPass')?.focus();
    }
  }catch{
    note(T[lang].serverError,true);
  }finally{
    if(btn)btn.disabled=false;
  }
}

const oldApplyLangPasswordReset=applyLang;
applyLang=function(){
  oldApplyLangPasswordReset();
  ensurePasswordResetButton();
  ensurePasswordResetForm();
};

ensurePasswordResetButton();
ensurePasswordResetForm();
</script></body></html>`
  );
  fs.writeFileSync(file, html, 'utf8');
  console.log('Injected password reset request + confirmation UI');
}
