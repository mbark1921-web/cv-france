(() => {
  const words={
    fr:{title:'Sécurité et confidentialité',password:'Changer le mot de passe',current:'Mot de passe actuel',next:'Nouveau mot de passe (8 à 128 caractères)',repeat:'Confirmer le nouveau mot de passe',passwordHelp:'Les autres sessions seront invalidées. Les brouillons locaux seront effacés après le changement.',logout:'Déconnecter tous les appareils',logoutHelp:'Cette action déconnecte également cet appareil et efface ses données locales. Continuer ?',export:'Exporter mes données',exportHelp:'Le fichier JSON contient le compte, les profils, CV et photos enregistrés, lettres, candidatures, compteurs IA, vos feedbacks, diagnostics liés au compte et utilisations d’invitations.',excluded:'Exclus : mots de passe et jetons, journaux internes et notes du personnel, dossiers et codes d’invitation administratifs, brouillons non enregistrés et résultats ATS/entretien temporaires, signalements non liés au compte, dossiers des prestataires, journaux serveur et sauvegardes.',delete:'Supprimer mon compte',deleteHelp:'Suppression définitive du compte, des profils, CV, lettres et candidatures. Exportez vos données avant de continuer. Les feedbacks, diagnostics et journaux historiques restent conservés sans lien au compte ; leur texte peut encore contenir des informations personnelles. Les sauvegardes et dossiers des prestataires ne sont pas effacés par cette action. Contactez le support pour ces données.',phrase:'Saisissez SUPPRIMER pour confirmer',word:'SUPPRIMER',cancel:'Annuler',confirmLogout:'Confirmer la déconnexion',confirmDelete:'Supprimer définitivement mon compte',working:'Traitement en cours…',passwordDone:'Mot de passe modifié. Les autres sessions sont déconnectées.',logoutDone:'Tous les appareils ont été déconnectés.',deleteDone:'Compte supprimé. Les données locales ont été effacées.',exportDone:'Export téléchargé. Le fichier contient vos données personnelles.',network:'Connexion impossible. Aucune confirmation reçue ; vous pouvez réessayer.',timeout:'Le délai de réponse est dépassé. Le résultat n’est pas confirmé.',server:'Le service est indisponible. Réessayez plus tard.',format:'La réponse reçue est invalide. Le résultat n’est pas confirmé.',auth:'Mot de passe incorrect ou session expirée. Vérifiez votre mot de passe ou reconnectez-vous.',blocked:'Un abonnement est lié au compte. Gérez ou annulez cet abonnement avant la suppression.',invalid:'Vérifiez les champs et les confirmations.',mismatch:'Les nouveaux mots de passe ne correspondent pas.',uncertain:'Votre session n’est plus active. Les données locales ont été effacées. Reconnectez-vous pour vérifier le résultat de l’opération.'},
    ar:{title:'الأمان والخصوصية',password:'تغيير كلمة المرور',current:'كلمة المرور الحالية',next:'كلمة المرور الجديدة (من 8 إلى 128 حرفاً)',repeat:'تأكيد كلمة المرور الجديدة',passwordHelp:'سيتم إبطال الجلسات الأخرى ومسح المسودات المحلية بعد التغيير.',logout:'تسجيل الخروج من جميع الأجهزة',logoutHelp:'سيتم تسجيل الخروج من هذا الجهاز أيضاً ومسح بياناته المحلية. هل تريد المتابعة؟',export:'تصدير بياناتي',exportHelp:'يتضمن ملف JSON الحساب والملفات المهنية والسير والصور المحفوظة والرسائل وطلبات العمل وعدادات الذكاء الاصطناعي وملاحظاتك والتشخيصات المرتبطة بالحساب وسجل استخدام الدعوات.',excluded:'لا يشمل كلمات المرور والرموز وسجلات الأمان الداخلية وملاحظات الموظفين وسجلات ورموز الدعوات الإدارية والمسودات غير المحفوظة ونتائج ATS والمقابلة المؤقتة والبلاغات غير المرتبطة بالحساب وسجلات مزودي الخدمة وسجلات الخادم والنسخ الاحتياطية.',delete:'حذف حسابي',deleteHelp:'حذف نهائي للحساب والملفات المهنية والسير والرسائل وطلبات العمل. صدّر بياناتك قبل المتابعة. تبقى الملاحظات والتشخيصات والسجلات التاريخية دون رابط بالحساب، وقد تتضمن نصوصها معلومات شخصية. لا تُحذف النسخ الاحتياطية وسجلات مزودي الخدمة بهذه العملية. تواصل مع الدعم بشأن هذه البيانات.',phrase:'اكتب حذف للتأكيد',word:'حذف',cancel:'إلغاء',confirmLogout:'تأكيد تسجيل الخروج',confirmDelete:'حذف حسابي نهائياً',working:'جارٍ تنفيذ الطلب…',passwordDone:'تم تغيير كلمة المرور وتسجيل خروج الجلسات الأخرى.',logoutDone:'تم تسجيل الخروج من جميع الأجهزة.',deleteDone:'تم حذف الحساب ومسح البيانات المحلية.',exportDone:'تم تنزيل التصدير. يحتوي الملف على بياناتك الشخصية.',network:'تعذر الاتصال ولم يصل تأكيد. يمكنك المحاولة مجدداً.',timeout:'انتهت مهلة الاستجابة ولم يتم تأكيد النتيجة.',server:'الخدمة غير متاحة. حاول لاحقاً.',format:'الاستجابة غير صالحة ولم يتم تأكيد النتيجة.',auth:'كلمة المرور غير صحيحة أو انتهت الجلسة. تحقق من كلمة المرور أو سجّل الدخول مجدداً.',blocked:'يوجد اشتراك مرتبط بالحساب. أدِر الاشتراك أو ألغِه قبل الحذف.',invalid:'تحقق من الحقول والتأكيدات.',mismatch:'كلمتا المرور الجديدتان غير متطابقتين.',uncertain:'لم تعد جلستك نشطة. تم مسح البيانات المحلية. سجّل الدخول للتحقق من نتيجة العملية.'}
  };
  const t=key=>words[lang==='ar'?'ar':'fr'][key];
  const panel=document.createElement('div');panel.id='accountControls';panel.className='card';panel.hidden=!token;
  panel.innerHTML=`<h3 data-account-text="title"></h3>
    <form id="accountPasswordForm" aria-describedby="accountPasswordHelp">
      <p id="accountPasswordHelp" data-account-text="passwordHelp"></p>
      <label for="accountCurrentPassword" data-account-text="current"></label><input id="accountCurrentPassword" type="password" autocomplete="current-password" required maxlength="128">
      <label for="accountNewPassword" data-account-text="next"></label><input id="accountNewPassword" type="password" autocomplete="new-password" required minlength="8" maxlength="128">
      <label for="accountRepeatPassword" data-account-text="repeat"></label><input id="accountRepeatPassword" type="password" autocomplete="new-password" required minlength="8" maxlength="128">
      <button type="submit" id="accountChangePassword" data-account-text="password"></button>
    </form>
    <p><button type="button" id="accountLogoutAll" data-account-text="logout"></button></p>
    <p id="accountExportHelp" data-account-text="exportHelp"></p><p id="accountExportExcluded" data-account-text="excluded"></p>
    <button type="button" id="accountExport" aria-describedby="accountExportHelp accountExportExcluded" data-account-text="export"></button>
    <p><button type="button" id="accountDelete" data-account-text="delete"></button></p>
    <div id="accountActionStatus" role="status" aria-live="polite" tabindex="-1"></div>
    <dialog id="accountLogoutDialog" aria-labelledby="accountLogoutTitle" aria-describedby="accountLogoutHelp">
      <h3 id="accountLogoutTitle" data-account-text="logout"></h3><p id="accountLogoutHelp" data-account-text="logoutHelp"></p>
      <button type="button" id="accountCancelLogout" data-account-text="cancel"></button><button type="button" id="accountConfirmLogout" data-account-text="confirmLogout"></button>
      <div class="account-dialog-status" role="status" aria-live="polite" tabindex="-1"></div>
    </dialog>
    <dialog id="accountDeleteDialog" aria-labelledby="accountDeleteTitle" aria-describedby="accountDeleteHelp">
      <h3 id="accountDeleteTitle" data-account-text="delete"></h3><p id="accountDeleteHelp" data-account-text="deleteHelp"></p>
      <label for="accountDeletePassword" data-account-text="current"></label><input id="accountDeletePassword" type="password" autocomplete="current-password" maxlength="128">
      <label for="accountDeletePhrase" data-account-text="phrase"></label><input id="accountDeletePhrase" autocomplete="off" spellcheck="false">
      <button type="button" id="accountCancelDelete" data-account-text="cancel"></button><button type="button" id="accountConfirmDelete" data-account-text="confirmDelete" disabled></button>
      <div class="account-dialog-status" role="status" aria-live="polite" tabindex="-1"></div>
    </dialog>`;
  document.getElementById('account').appendChild(panel);
  const style=document.createElement('style');style.textContent='#accountControls[hidden]{display:none!important}#accountControls dialog{max-width:min(38rem,calc(100vw - 3rem));max-height:85vh;overflow:auto;border:1px solid #667085;border-radius:12px;box-sizing:border-box}#accountControls dialog::backdrop{background:#0008}#accountControls button:focus-visible,#accountControls input:focus-visible{outline:3px solid #2563eb;outline-offset:3px}#accountControls button:disabled{opacity:.6;cursor:wait}#accountControls label{display:block}';document.head.appendChild(style);
  const el=id=>document.getElementById(id),startToken=token;
  let busy=false,lastStatus='';
  const current=()=>token===startToken&&(localStorage.getItem('cvf_token')||'')===startToken;
  function validDeletion(){return el('accountDeletePassword').value.length>0&&el('accountDeletePhrase').value.trim()===t('word');}
  function buttons(){panel.querySelectorAll('button').forEach(b=>{b.disabled=busy;});el('accountConfirmDelete').disabled=busy||!validDeletion();panel.setAttribute('aria-busy',String(busy));}
  function announce(key,focus=true){
    lastStatus=key;
    const box=panel.querySelector('dialog[open] .account-dialog-status')||el('accountActionStatus');
    box.textContent=t(key);if(focus)box.focus();
  }
  function translate(){panel.querySelectorAll('[data-account-text]').forEach(node=>{node.textContent=t(node.dataset.accountText);});buttons();if(lastStatus)announce(lastStatus,false);}
  async function api(endpoint,method='GET',body){
    const controller=new AbortController();let timer;
    try{return await Promise.race([
      (async()=>{const r=await fetch('/api/'+endpoint,{method,headers:{...H(),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal});
        if(!r.ok)throw Object.assign(new Error('http'),{kind:r.status===401?'auth':r.status===409?'blocked':r.status>=500?'server':'invalid',status:r.status});
        let data;try{data=await r.json();}catch{throw {kind:'format'};}if(!data||typeof data!=='object')throw {kind:'format'};return data;})(),
      new Promise((_,reject)=>{timer=setTimeout(()=>{reject({kind:'timeout'});controller.abort();},15000);})
    ]);}catch(error){throw error.kind?error:{kind:'network'};}finally{clearTimeout(timer);}
  }
  async function run(action,work){
    if(busy||!token||!current())return;
    busy=true;buttons();announce('working',false);
    try{await work();}
    catch(error){
      if(!current())return;
      // A lost mutation response may mean the old session was already invalidated.
      if(action!=='export'&&!['invalid','blocked'].includes(error.kind)){
        try{await api('me');}catch(probe){if(probe.status===401){resetUserSession('',t('uncertain'));return;}}
      }
      if(current())announce(error.kind||'network');
    }finally{busy=false;buttons();}
  }
  const passwordForm=el('accountPasswordForm');
  passwordForm.noValidate=true;
  passwordForm.addEventListener('submit',event=>{
    event.preventDefault();if(busy)return;
    const inputs=[...passwordForm.querySelectorAll('input')];inputs.forEach(input=>input.removeAttribute('aria-invalid'));
    const invalid=inputs.find(input=>input.value.length<(input.minLength>0?input.minLength:1)||input.value.length>128);
    if(invalid){invalid.setAttribute('aria-invalid','true');announce('invalid');invalid.focus();return;}
    if(el('accountNewPassword').value!==el('accountRepeatPassword').value){el('accountRepeatPassword').setAttribute('aria-invalid','true');announce('mismatch');el('accountRepeatPassword').focus();return;}
    run('password',async()=>{
      const data=await api('account/change-password','POST',{currentPassword:el('accountCurrentPassword').value,newPassword:el('accountNewPassword').value});
      if(typeof data.token!=='string'||!data.token)throw {kind:'format'};
      if(current())resetUserSession(data.token,t('passwordDone'));
    });
  });
  function dialog(name,opener){
    const d=el('account'+name+'Dialog'),cancel=el('accountCancel'+name);
    const clear=()=>{d.querySelectorAll('input').forEach(input=>{input.value='';});buttons();};
    el(opener).onclick=()=>{if(busy||!token||d.open)return;d.querySelector('.account-dialog-status').textContent='';d.showModal();cancel.focus();};
    cancel.onclick=()=>{if(!busy){clear();d.close();}};
    d.addEventListener('cancel',event=>{if(busy)event.preventDefault();else clear();});
    d.addEventListener('close',()=>{clear();el(opener).focus();});
    return d;
  }
  dialog('Logout','accountLogoutAll');dialog('Delete','accountDelete');
  for(const id of ['accountDeletePassword','accountDeletePhrase'])el(id).addEventListener('input',buttons);
  el('accountConfirmLogout').onclick=()=>{if(el('accountLogoutDialog').open)run('logout',async()=>{await api('account/logout-all','POST');if(current())resetUserSession('',t('logoutDone'));});};
  el('accountConfirmDelete').onclick=()=>{
    if(!el('accountDeleteDialog').open||!validDeletion()||busy)return;
    run('delete',async()=>{await api('account','DELETE',{password:el('accountDeletePassword').value});if(current())resetUserSession('',t('deleteDone'));});
  };
  el('accountExport').onclick=()=>run('export',async()=>{
    const data=await api('account/export');
    if(!data.user||!['profiles','cvs','letters','applications','ai_usage','feedback','client_errors','beta_invite_uses','excluded'].every(key=>Array.isArray(data[key])))throw {kind:'format'};
    if(!current())return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='jovelya-data-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('exportDone');
  });
  const priorLang=applyLang;applyLang=function(){const result=priorLang.apply(this,arguments);translate();return result;};
  translate();
  const banner=el('banner');banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');banner.tabIndex=-1;
  addEventListener('DOMContentLoaded',()=>{if(['passwordDone','logoutDone','deleteDone','uncertain'].some(key=>banner.textContent===t(key)))banner.focus();});
})();
