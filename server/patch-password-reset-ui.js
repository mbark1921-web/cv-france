import fs from 'fs';
import path from 'path';

const file = path.resolve('public/index.html');
let html = fs.readFileSync(file, 'utf8');
const marker = 'PASSWORD_RESET_UI_V20_2_5';

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
  if(!email){note(lang==='ar'?'اكتب بريدك الإلكتروني أولاً.':'Saisissez d’abord votre e-mail.',true);return;}
  try{
    const r=await fetch(A+'/auth/request-password-reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
    const d=await r.json();
    note(d.message||d.error||T[lang].serverError,!r.ok);
  }catch{note(T[lang].serverError,true);}
}
const oldApplyLangPasswordReset=applyLang;
applyLang=function(){oldApplyLangPasswordReset();ensurePasswordResetButton();};
ensurePasswordResetButton();
</script></body></html>`
  );
  fs.writeFileSync(file, html, 'utf8');
  console.log('Injected password reset UI');
}
