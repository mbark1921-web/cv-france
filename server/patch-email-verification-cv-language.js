import fs from 'fs';
import path from 'path';

const file = path.resolve('public/index.html');
let html = fs.readFileSync(file, 'utf8');
const marker = 'EMAIL_VERIFY_CV_LANG_V20_2_9';

if (!html.includes(marker)) {
  html = html.replace(
    '</body></html>',
    `<script>/* ${marker} */
(function(){
  function getCvLang(){
    const sel=document.getElementById('cvLanguage');
    return sel&&sel.value==='ar'?'ar':'fr';
  }
  function ensureCvLanguageSelector(){
    const template=document.getElementById('cvTemplate');
    if(!template||document.getElementById('cvLanguage'))return;
    const label=document.createElement('label');
    label.id='cvLanguageLabel';
    label.htmlFor='cvLanguage';
    label.textContent=lang==='ar'?'لغة السيرة الذاتية':'Langue du CV';
    const sel=document.createElement('select');
    sel.id='cvLanguage';
    const fr=document.createElement('option');fr.value='fr';fr.textContent='Français';
    const ar=document.createElement('option');ar.value='ar';ar.textContent='العربية';
    sel.append(fr,ar);
    sel.value=lang==='ar'?'ar':'fr';
    sel.onchange=()=>window.updateCvPreview&&window.updateCvPreview();
    template.insertAdjacentElement('beforebegin',sel);
    sel.insertAdjacentElement('beforebegin',label);
  }

  const oldUpdate=window.updateCvPreview;
  window.updateCvPreview=function(){
    ensureCvLanguageSelector();
    if(typeof oldUpdate==='function')oldUpdate();
    const box=document.getElementById('cvPreview');
    if(!box)return;
    const cvLang=getCvLang();
    box.lang=cvLang;
    box.dir=cvLang==='ar'?'rtl':'ltr';
    const titles=cvLang==='ar'
      ?['الملف المهني','الخبرات','المهارات','الدراسة والتكوين','اللغات']
      :['Profil professionnel','Expériences','Compétences','Formation','Langues'];
    box.querySelectorAll('h2').forEach((h,i)=>{if(titles[i])h.textContent=titles[i]});
    const name=document.getElementById('cvFullName')?.value?.trim();
    const h1=box.querySelector('h1');
    if(h1&&!name)h1.textContent=cvLang==='ar'?'سيرتي الذاتية':'Mon CV';
    box.querySelectorAll('h1,h2,p').forEach(el=>{el.style.textAlign=cvLang==='ar'?'right':'left'});
  };

  const oldBody=window.cvBody;
  window.cvBody=function(){
    const body=typeof oldBody==='function'?oldBody():null;
    if(body&&body.data)body.data.cvLanguage=getCvLang();
    return body;
  };

  const oldLoad=window.loadCvIntoForm;
  window.loadCvIntoForm=function(cv){
    if(typeof oldLoad==='function')oldLoad(cv);
    ensureCvLanguageSelector();
    const sel=document.getElementById('cvLanguage');
    if(sel)sel.value=cv?.data?.cvLanguage==='ar'?'ar':'fr';
    window.updateCvPreview&&window.updateCvPreview();
  };

  const oldNew=window.newCvFinal;
  window.newCvFinal=function(){
    if(typeof oldNew==='function')oldNew();
    ensureCvLanguageSelector();
    const sel=document.getElementById('cvLanguage');
    if(sel)sel.value=lang==='ar'?'ar':'fr';
    window.updateCvPreview&&window.updateCvPreview();
  };

  async function verifyEmailFromUrl(){
    const params=new URLSearchParams(location.search);
    const verify=params.get('verify');
    if(!verify)return;
    try{
      const r=await fetch('/api/auth/verify-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:verify})});
      const d=await r.json();
      if(r.ok){
        history.replaceState({},'',location.pathname);
        note(lang==='ar'?'تم تأكيد البريد الإلكتروني بنجاح. سجّل الدخول من جديد.':'Adresse e-mail confirmée. Reconnectez-vous.',false);
      }else note(d.error||'Erreur',true);
    }catch{note(lang==='ar'?'تعذر تأكيد البريد الإلكتروني.':'Impossible de confirmer l’adresse e-mail.',true)}
  }

  async function refreshVerificationState(){
    if(!token)return;
    try{
      const r=await fetch('/api/me',{headers:H()});
      const d=await r.json();
      const me=document.getElementById('me');
      if(r.ok&&me&&d.user){
        const verified=Boolean(d.user.email_verified);
        me.textContent=(d.user.email||'')+' — '+(d.user.plan||'free')+' — '+(verified?(lang==='ar'?'البريد مؤكد':'e-mail confirmé'):(lang==='ar'?'البريد غير مؤكد':'e-mail non confirmé'));
        let btn=document.getElementById('resendVerificationBtn');
        if(!verified){
          if(!btn){btn=document.createElement('button');btn.id='resendVerificationBtn';btn.type='button';btn.onclick=resendVerification;me.insertAdjacentElement('afterend',btn)}
          btn.textContent=lang==='ar'?'إعادة إرسال رسالة التأكيد':'Renvoyer l’e-mail de confirmation';
        }else if(btn)btn.remove();
      }
    }catch{}
  }

  window.resendVerification=async function(){
    const r=await fetch('/api/auth/resend-verification',{method:'POST',headers:H()});
    const d=await r.json();
    note(d.message||d.error||'Erreur',!r.ok);
  };

  const oldSave=window.saveCvFinal;
  window.saveCvFinal=async function(){
    ensureCvLanguageSelector();
    try{
      const body=window.cvBody?window.cvBody():null;
      const editing=Number.isInteger(window.activeCvId)&&window.activeCvId>0;
      if(!body||!body.title){note(lang==='ar'?'أدخل عنوان السيرة الذاتية.':'Donnez un titre au CV.',true);return}
      if(typeof oldSave==='function')return await oldSave();
    }catch(e){note((lang==='ar'?'تعذر حفظ السيرة الذاتية: ':'Impossible d’enregistrer le CV : ')+(e?.message||'Erreur'),true)}
  };

  const oldApply=window.applyLang;
  if(typeof oldApply==='function')window.applyLang=function(){oldApply();ensureCvLanguageSelector();const l=document.getElementById('cvLanguageLabel');if(l)l.textContent=lang==='ar'?'لغة السيرة الذاتية':'Langue du CV';refreshVerificationState();window.updateCvPreview&&window.updateCvPreview();};
  const oldLogin=window.login;
  if(typeof oldLogin==='function')window.login=async function(){const x=await oldLogin();setTimeout(refreshVerificationState,100);return x};
  ensureCvLanguageSelector();
  verifyEmailFromUrl();
  setTimeout(refreshVerificationState,120);
})();
</script></body></html>`
  );
  fs.writeFileSync(file, html, 'utf8');
  console.log('Injected email verification and per-CV language UI');
}
